(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9002/api/orders/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ materialId: 'M-1', quantity: 1, unitPrice: 0, shortageAction: 'PRODUCE' }] }),
    })
    console.log('STATUS', res.status)
    const body = await res.text()
    console.log('BODY', body)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
