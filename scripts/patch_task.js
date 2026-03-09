(async () => {
  try {
    const id = 'PT-6'
    let res = await fetch('http://127.0.0.1:9002/api/production/' + id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    })
    console.log('START STATUS', res.status)
    console.log('START BODY', await res.text())

    res = await fetch('http://127.0.0.1:9002/api/production/' + id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    console.log('COMPLETE STATUS', res.status)
    console.log('COMPLETE BODY', await res.text())

    const inv = await fetch('http://127.0.0.1:9002/api/inventory')
    console.log('INVENTORY STATUS', inv.status)
    console.log(await inv.text())
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
