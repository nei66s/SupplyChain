const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const TENANT_SLUG = 'sao-jose-cordas';
const SOURCE = 'legacy_excel';
const EXPORT_DIR = path.join(process.cwd(), 'data', 'raw', 'export_app');
const INPUT_CSV = path.join(EXPORT_DIR, 'relatorio_import_final.csv');
const REVIEWED_CSV = path.join(EXPORT_DIR, 'relatorio_import_revisado.csv');

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(value);
      value = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      continue;
    }

    value += ch;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  const [header, ...data] = rows;
  return data.map((cells) => {
    const item = {};
    header.forEach((key, index) => {
      item[key] = cells[index] ?? '';
    });
    return item;
  });
}

function toCsv(rows, headers) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header] ?? '')).join(','));
  }
  return `\uFEFF${lines.join('\n')}\n`;
}

function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fixMojibake(value) {
  const text = normalizeSpaces(value);
  if (!/[ÃÂ�]/.test(text)) return text;
  try {
    return Buffer.from(text, 'latin1').toString('utf8');
  } catch {
    return text;
  }
}

function slugify(value) {
  return fixMojibake(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normKey(value) {
  return slugify(value);
}

function parseDecimal(value) {
  const text = normalizeSpaces(value);
  if (!text) return null;
  const normalized =
    text.includes(',') && text.includes('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function mapUnit(rawUnit) {
  const unit = slugify(rawUnit);
  if (!unit) return '';
  if (['kg', 'kgs', 'quilo', 'quilos'].includes(unit)) return 'KG';
  if (['g', 'grama', 'gramas'].includes(unit)) return 'G';
  if (['m', 'mt', 'mts', 'metro', 'metros', 'ts'].includes(unit)) return 'M';
  if (['pc', 'pcs', 'peca', 'pecas', 'pca'].includes(unit)) return 'PC';
  if (unit.startsWith('p')) return 'PC';
  return unit.toUpperCase();
}

function parseMeasure(raw) {
  const text = fixMojibake(raw);
  if (!text) return { quantity: null, unit: '' };

  const combined = text.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([A-Za-zÀ-ÿÇç]+)$/u);
  if (combined) {
    return {
      quantity: parseDecimal(combined[1]),
      unit: mapUnit(combined[2]),
    };
  }

  const unitOnly = mapUnit(text);
  if (unitOnly) return { quantity: 1, unit: unitOnly };

  const numericOnly = parseDecimal(text);
  if (numericOnly !== null) return { quantity: numericOnly, unit: '' };

  return { quantity: null, unit: '' };
}

function chooseCounterWinner(counter) {
  let winner = '';
  let winnerCount = -1;
  for (const [key, count] of Object.entries(counter)) {
    if (count > winnerCount) {
      winner = key;
      winnerCount = count;
    }
  }
  return winner;
}

function inferUnit(row, unitByProductDescription, unitByProduct) {
  const productKey = normKey(row.produto);
  const descKey = `${productKey}::${normKey(row.descricao)}`;
  const byDescription = chooseCounterWinner(unitByProductDescription[descKey] || {});
  if (byDescription) return byDescription;

  const byProduct = chooseCounterWinner(unitByProduct[productKey] || {});
  if (byProduct) return byProduct;

  if (productKey === slugify('Fibra Sintética')) return 'PC';
  return 'KG';
}

function deriveStatus(originalType) {
  return slugify(originalType) === 'cancelado' ? 'CANCELADO' : 'FINALIZADO';
}

function deriveOperationMode(unit) {
  return unit === 'PC' ? 'QUANTITY' : 'WEIGHT';
}

function buildReviewedRows(rawRows) {
  const unitByProductDescription = {};
  const unitByProduct = {};
  const packageCounters = new Map();

  for (const row of rawRows) {
    const parsed = parseMeasure(row.peso_metros_bruto);
    const explicitUnit = mapUnit(row.unidade) || parsed.unit;
    if (!explicitUnit) continue;

    const productKey = normKey(row.produto);
    const descKey = `${productKey}::${normKey(row.descricao)}`;
    unitByProductDescription[descKey] ||= {};
    unitByProductDescription[descKey][explicitUnit] = (unitByProductDescription[descKey][explicitUnit] || 0) + 1;
    unitByProduct[productKey] ||= {};
    unitByProduct[productKey][explicitUnit] = (unitByProduct[productKey][explicitUnit] || 0) + 1;
  }

  return rawRows.map((row) => {
    const parsed = parseMeasure(row.peso_metros_bruto);
    let quantity = parseDecimal(row.quantidade);
    let unit = mapUnit(row.unidade) || parsed.unit;

    if (quantity === null && parsed.quantity !== null) quantity = parsed.quantity;
    if (parsed.quantity !== null && quantity !== null && !unit) unit = parsed.unit;
    if (!unit) unit = inferUnit(row, unitByProductDescription, unitByProduct);

    const basePackage = row.pacote || '';
    const packageCount = basePackage ? (packageCounters.get(basePackage) || 0) + 1 : 1;
    if (basePackage) packageCounters.set(basePackage, packageCount);
    const orderNumberImport = !basePackage
      ? ''
      : packageCount === 1
        ? basePackage
        : `${basePackage}-${packageCount}`;

    return {
      ...row,
      quantidade: quantity !== null ? String(quantity) : '',
      unidade: unit,
      operation_mode: deriveOperationMode(unit),
      status_importacao: deriveStatus(row.tipo),
      order_number_import: orderNumberImport,
    };
  });
}

async function main() {
  if (!fs.existsSync(INPUT_CSV)) {
    throw new Error(`Arquivo não encontrado: ${INPUT_CSV}`);
  }

  const rawRows = parseCsv(INPUT_CSV).map((row) => ({
    pacote: normalizeSpaces(row.pacote),
    operador: fixMojibake(row.operador),
    codigo: normalizeSpaces(row.codigo),
    produto: fixMojibake(row.produto),
    descricao: fixMojibake(row.descricao),
    cor: fixMojibake(row.cor),
    pedido: fixMojibake(row.pedido),
    peso_metros_bruto: fixMojibake(row.peso_metros_bruto),
    quantidade: normalizeSpaces(row.quantidade),
    unidade: normalizeSpaces(row.unidade),
    data: normalizeSpaces(row.data),
    tipo: fixMojibake(row.tipo),
  }));

  const reviewedRows = buildReviewedRows(rawRows);
  fs.writeFileSync(
    REVIEWED_CSV,
    toCsv(reviewedRows, [
      'pacote',
      'operador',
      'codigo',
      'produto',
      'descricao',
      'cor',
      'pedido',
      'peso_metros_bruto',
      'quantidade',
      'unidade',
      'data',
      'tipo',
      'operation_mode',
      'status_importacao',
      'order_number_import',
    ])
  );

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    const tenantRes = await client.query('SELECT id, name FROM tenants WHERE slug = $1 LIMIT 1', [TENANT_SLUG]);
    if (tenantRes.rowCount === 0) throw new Error(`Tenant não encontrado: ${TENANT_SLUG}`);
    const tenantId = tenantRes.rows[0].id;

    await client.query(`SET app.current_tenant_id = ${client.escapeLiteral(tenantId)}`);

    const usersRes = await client.query('SELECT id, name FROM users WHERE tenant_id = $1', [tenantId]);
    const userByName = new Map(usersRes.rows.map((row) => [normKey(row.name), row.id]));
    const fallbackUserId = userByName.get('admin') || usersRes.rows[0]?.id || null;
    if (!fallbackUserId) throw new Error('Nenhum usuário encontrado para vincular os pedidos.');

    const materialsRes = await client.query('SELECT id, sku, name FROM materials WHERE tenant_id = $1', [tenantId]);
    const materialByName = new Map(materialsRes.rows.map((row) => [normKey(row.name), row]));
    const materialByCode = new Map(
      materialsRes.rows
        .map((row) => {
          const match = String(row.sku || '').match(/(\d{2,})$/);
          return [match ? match[1] : '', row];
        })
        .filter(([key]) => key)
    );

    const clientsRes = await client.query('SELECT id, name FROM clients WHERE tenant_id = $1', [tenantId]);
    const clientByName = new Map(clientsRes.rows.map((row) => [normKey(row.name), row]));

    const existingOrdersRes = await client.query(
      'SELECT order_number FROM orders WHERE tenant_id = $1 AND source = $2',
      [tenantId, SOURCE]
    );
    const existingOrderNumbers = new Set(existingOrdersRes.rows.map((row) => String(row.order_number)));

    const missingClients = Array.from(
      new Set(
        reviewedRows
          .map((row) => fixMojibake(row.pedido || 'Sem cliente'))
          .filter((name) => name && !clientByName.has(normKey(name)))
      )
    );

    if (missingClients.length > 0) {
      await client.query(
        `INSERT INTO clients (name, tenant_id)
         SELECT item.name, $1::uuid
         FROM json_to_recordset($2::json) AS item(name text)`,
        [tenantId, JSON.stringify(missingClients.map((name) => ({ name })))]
      );
      const refreshedClientsRes = await client.query('SELECT id, name FROM clients WHERE tenant_id = $1', [tenantId]);
      clientByName.clear();
      for (const row of refreshedClientsRes.rows) {
        clientByName.set(normKey(row.name), row);
      }
    }

    const missingProducts = [];
    for (const row of reviewedRows) {
      const productKey = normKey(row.produto);
      if (materialByName.has(productKey)) continue;
      if (row.codigo && materialByCode.has(row.codigo)) continue;
      if (!row.produto) continue;
      missingProducts.push(row);
    }

    const createdMaterialNames = [];
    for (const row of missingProducts) {
      const productKey = normKey(row.produto);
      if (materialByName.has(productKey)) continue;
      const skuBase = row.codigo ? `LEG-${row.codigo}` : `LEG-${slugify(row.produto).toUpperCase()}`;
      let sku = skuBase;
      let suffix = 1;
      while ([...materialByName.values()].some((item) => item.sku === sku)) {
        suffix += 1;
        sku = `${skuBase}-${suffix}`;
      }
      const insertMaterial = await client.query(
        `INSERT INTO materials
          (sku, name, description, unit, color_options, metadata, tenant_id)
         VALUES ($1, $2, $3, $4, '[]'::jsonb, $5::jsonb, $6)
         RETURNING id, sku, name`,
        [
          sku,
          row.produto,
          row.descricao || null,
          row.unidade || 'KG',
          JSON.stringify({ importedFrom: 'excel', legacyCode: row.codigo || '' }),
          tenantId,
        ]
      );
      const created = insertMaterial.rows[0];
      materialByName.set(productKey, created);
      if (row.codigo) materialByCode.set(row.codigo, created);
      createdMaterialNames.push(created.name);
      await client.query(
        'INSERT INTO stock_balances (material_id, on_hand, tenant_id) VALUES ($1, 0, $2) ON CONFLICT (material_id) DO NOTHING',
        [created.id, tenantId]
      );
    }

    const stagedRows = reviewedRows
      .filter((row) => row.order_number_import && !existingOrderNumbers.has(row.order_number_import))
      .map((row) => {
        const material =
          (row.codigo ? materialByCode.get(row.codigo) : null) ||
          materialByName.get(normKey(row.produto));
        const orderClient = clientByName.get(normKey(row.pedido || 'Sem cliente'));
        if (!material) throw new Error(`Material não encontrado para "${row.produto}"`);
        if (!orderClient) throw new Error(`Cliente não encontrado para "${row.pedido}"`);
        const quantity = parseDecimal(row.quantidade) ?? 0;
        const isCancelled = row.status_importacao === 'CANCELADO';
        const userId = userByName.get(normKey(row.operador)) || fallbackUserId;
        const createdAt = row.data ? new Date(row.data).toISOString() : new Date().toISOString();
        return {
          order_number: row.order_number_import,
          pacote_original: row.pacote,
          status: row.status_importacao,
          created_at: createdAt,
          due_date: createdAt,
          client_id: Number(orderClient.id),
          client_name: orderClient.name,
          created_by: userId,
          picker_id: userId,
          picking_label_printed: row.tipo.toLowerCase().includes('impress'),
          operation_mode: row.operation_mode,
          material_id: Number(material.id),
          quantity,
          color: row.cor || null,
          qty_reserved_from_stock: isCancelled ? 0 : quantity,
          qty_separated: isCancelled ? 0 : quantity,
          separated_weight: row.operation_mode === 'WEIGHT' && !isCancelled ? quantity : null,
          requested_weight: row.operation_mode === 'WEIGHT' ? quantity : null,
          item_description: row.descricao || null,
          actor: row.operador || 'Importador',
          details: JSON.stringify({
            pacote: row.pacote,
            orderNumberImport: row.order_number_import,
            pedido: row.pedido,
            tipoOriginal: row.tipo,
            unidadeOriginal: row.peso_metros_bruto,
            unidadeFinal: row.unidade,
          }),
        };
      });

    if (stagedRows.length > 0) {
      await client.query(
        `CREATE TEMP TABLE legacy_stage (
          order_number text,
          pacote_original text,
          status text,
          created_at timestamptz,
          due_date timestamptz,
          client_id integer,
          client_name text,
          created_by text,
          picker_id text,
          picking_label_printed boolean,
          operation_mode text,
          material_id integer,
          quantity numeric(12,4),
          color text,
          qty_reserved_from_stock numeric(12,4),
          qty_separated numeric(12,4),
          separated_weight numeric(12,4),
          requested_weight numeric(12,4),
          item_description text,
          actor text,
          details text
        ) ON COMMIT DROP`
      );

      await client.query(
        `INSERT INTO legacy_stage
         SELECT *
         FROM json_to_recordset($1::json) AS x(
           order_number text,
           pacote_original text,
           status text,
           created_at timestamptz,
           due_date timestamptz,
           client_id integer,
           client_name text,
           created_by text,
           picker_id text,
           picking_label_printed boolean,
           operation_mode text,
           material_id integer,
           quantity numeric(12,4),
           color text,
           qty_reserved_from_stock numeric(12,4),
           qty_separated numeric(12,4),
           separated_weight numeric(12,4),
           requested_weight numeric(12,4),
           item_description text,
           actor text,
           details text
         )`,
        [JSON.stringify(stagedRows)]
      );

      await client.query(
        `INSERT INTO orders
          (status, total, created_at, order_number, client_id, client_name, created_by, picker_id, due_date, volume_count, label_print_count, source, tenant_id, picking_label_printed, operation_mode)
         SELECT
          s.status,
          0,
          s.created_at,
          s.order_number,
          s.client_id,
          s.client_name,
          s.created_by,
          s.picker_id,
          s.due_date,
          1,
          0,
          $1,
          $2::uuid,
          s.picking_label_printed,
          s.operation_mode
         FROM legacy_stage s
         WHERE NOT EXISTS (
           SELECT 1
           FROM orders o
           WHERE o.tenant_id = $2::uuid
             AND o.source = $1
            AND o.order_number = s.order_number
         )`,
        [SOURCE, tenantId]
      );

      await client.query(
        `INSERT INTO order_items
          (order_id, material_id, quantity, unit_price, conditions, color, shortage_action, qty_reserved_from_stock, qty_to_produce, qty_separated, separated_weight, item_description, tenant_id, requested_weight)
         SELECT
          o.id,
          s.material_id,
          s.quantity,
          0,
          '[]'::jsonb,
          s.color,
          'PRODUCE',
          s.qty_reserved_from_stock,
          0,
          s.qty_separated,
          s.separated_weight,
          s.item_description,
          $1::uuid,
          s.requested_weight
         FROM legacy_stage s
         JOIN orders o
           ON o.tenant_id = $1::uuid
          AND o.source = $2
          AND o.order_number = s.order_number
         WHERE NOT EXISTS (
           SELECT 1
           FROM order_items oi
           WHERE oi.order_id = o.id
         )`,
        [tenantId, SOURCE]
      );

      await client.query(
        `INSERT INTO audit_events (order_id, action, actor, timestamp, details, tenant_id)
         SELECT
          o.id,
          'LEGACY_IMPORT',
          s.actor,
          s.created_at,
          s.details,
          $1::uuid
         FROM legacy_stage s
         JOIN orders o
           ON o.tenant_id = $1::uuid
          AND o.source = $2
          AND o.order_number = s.order_number
         WHERE NOT EXISTS (
           SELECT 1
           FROM audit_events ae
           WHERE ae.order_id = o.id
             AND ae.action = 'LEGACY_IMPORT'
         )`,
        [tenantId, SOURCE]
      );
    }

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          tenant: tenantRes.rows[0].name,
          reviewedCsv: REVIEWED_CSV,
          stagedRows: stagedRows.length,
          createdClients: missingClients.length,
          createdMaterials: createdMaterialNames.length,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
