const fs = require('fs');
const filepath = 'src/app/orders/page.tsx';
const txt = fs.readFileSync(filepath, 'utf8');
const lines = txt.split('\n');

const fixed = [
    ...lines.slice(0, 246),
    "      body: JSON.stringify({ action: 'heartbeat' }),",
    "    });",
    "    await refreshInventory();",
    "  }, [refreshInventory]);",
    ...lines.slice(446)
].join('\n');

fs.writeFileSync(filepath, fixed);
console.log('Fixed');
