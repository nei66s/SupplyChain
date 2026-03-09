(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9002/api/production', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 1, materialId: 1, qtyToProduce: 1 }),
    })
    console.log('STATUS', res.status)
    const body = await res.text()
    console.log('BODY', body)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
