const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const TENANT_SLUG = process.argv[2] || 'sao-jose-cordas';
const CSV_PATH = path.join(process.cwd(), 'data', 'raw', 'export_app', 'cadastro_variacoes.csv');
const TYPES_CSV_PATH = path.join(process.cwd(), 'data', 'raw', 'export_app', 'cadastro_tipos.csv');

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

function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fixMojibake(value) {
  const text = normalizeSpaces(value);
  if (!/[ÃƒÃ‚ï¿½]/.test(text)) return text;
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

function uniqueSorted(values) {
  return [...new Set(values.map(fixMojibake).map(normalizeSpaces).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

const categoryMap = {
  fibra: { descriptionCategory: 'Fibra', colorCategory: 'FibraCor', materialNames: ['Fibra Sintética'] },
  corda: { descriptionCategory: 'Corda', colorCategory: 'CordaCor', materialNames: ['Corda Náutica'] },
  trico: { descriptionCategory: 'Trico', colorCategory: 'TricoCor', materialNames: ['Trico Náutico'] },
  fio: { descriptionCategory: 'Fio', colorCategory: 'Fiocor', materialNames: ['Fio'] },
};

async function ensureCategory(client, tenantId, name) {
  const existing = await client.query(
    'SELECT id FROM precondition_categories WHERE lower(name) = lower($1) AND tenant_id = $2::uuid',
    [name, tenantId]
  );
  if (existing.rowCount > 0) return Number(existing.rows[0].id);

  const created = await client.query(
    'INSERT INTO precondition_categories (name, tenant_id) VALUES ($1, $2::uuid) RETURNING id',
    [name, tenantId]
  );
  return Number(created.rows[0].id);
}

async function ensureValue(client, categoryId, tenantId, value) {
  const normalized = normalizeSpaces(value);
  if (!normalized) return false;
  const res = await client.query(
    `INSERT INTO precondition_values (category_id, value, tenant_id)
     VALUES ($1, $2, $3::uuid)
     ON CONFLICT (category_id, value) DO NOTHING`,
    [categoryId, normalized, tenantId]
  );
  return res.rowCount > 0;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) throw new Error(`Arquivo não encontrado: ${CSV_PATH}`);
  if (!fs.existsSync(TYPES_CSV_PATH)) throw new Error(`Arquivo não encontrado: ${TYPES_CSV_PATH}`);

  const csvRows = parseCsv(CSV_PATH);
  const typeRows = parseCsv(TYPES_CSV_PATH);
  const grouped = {};

  for (const row of csvRows) {
    const categoryKey = slugify(row.categoria);
    const config = categoryMap[categoryKey];
    if (!config) continue;
    grouped[categoryKey] ||= { descriptions: [], colors: [] };
    if (normalizeSpaces(row.descricao)) grouped[categoryKey].descriptions.push(row.descricao);
    if (normalizeSpaces(row.cor)) grouped[categoryKey].colors.push(row.cor);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    const tenantRes = await client.query(
      'SELECT id FROM tenants WHERE slug = $1 LIMIT 1',
      [TENANT_SLUG]
    );
    if (tenantRes.rowCount === 0) throw new Error(`Tenant não encontrado: ${TENANT_SLUG}`);
    const tenantId = tenantRes.rows[0].id;

    let insertedValues = 0;
    const summary = [];

    for (const [categoryKey, config] of Object.entries(categoryMap)) {
      const descriptionCategoryId = await ensureCategory(client, tenantId, config.descriptionCategory);
      const colorCategoryId = await ensureCategory(client, tenantId, config.colorCategory);

      const descriptions = uniqueSorted(grouped[categoryKey]?.descriptions || []);
      const colors = uniqueSorted(grouped[categoryKey]?.colors || []);

      let insertedDescriptions = 0;
      let insertedColors = 0;

      for (const description of descriptions) {
        if (await ensureValue(client, descriptionCategoryId, tenantId, description)) insertedDescriptions += 1;
      }
      for (const color of colors) {
        if (await ensureValue(client, colorCategoryId, tenantId, color)) insertedColors += 1;
      }

      insertedValues += insertedDescriptions + insertedColors;

      const materialsRes = await client.query(
        `SELECT id, color_options
         FROM materials
         WHERE tenant_id = $1::uuid
           AND name = ANY($2::text[])`,
        [tenantId, config.materialNames]
      );

      for (const material of materialsRes.rows) {
        const existingColors = Array.isArray(material.color_options) ? material.color_options : [];
        const mergedColors = uniqueSorted([...existingColors, ...colors]);
        await client.query(
          'UPDATE materials SET color_options = $2::jsonb WHERE id = $1',
          [material.id, JSON.stringify(mergedColors)]
        );
      }

      summary.push({
        category: categoryKey,
        descriptions,
        colors,
        insertedDescriptions,
        insertedColors,
        materialsUpdated: materialsRes.rowCount,
      });
    }

    const typeCategoryId = await ensureCategory(client, tenantId, 'Tipo do Pedido');
    const typeValues = uniqueSorted(typeRows.map((row) => row.tipo));
    let insertedTypeValues = 0;
    for (const value of typeValues) {
      if (await ensureValue(client, typeCategoryId, tenantId, value)) insertedTypeValues += 1;
    }

    summary.push({
      category: 'tipo-do-pedido',
      descriptions: typeValues,
      colors: [],
      insertedDescriptions: insertedTypeValues,
      insertedColors: 0,
      materialsUpdated: 0,
    });

    insertedValues += insertedTypeValues;

    await client.query('COMMIT');

    console.log(JSON.stringify({
      tenantSlug: TENANT_SLUG,
      csvPath: CSV_PATH,
      insertedValues,
      summary: summary.map((item) => ({
        category: item.category,
        totalDescriptions: item.descriptions.length,
        totalColors: item.colors.length,
        insertedDescriptions: item.insertedDescriptions,
        insertedColors: item.insertedColors,
        materialsUpdated: item.materialsUpdated,
      })),
    }, null, 2));
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
