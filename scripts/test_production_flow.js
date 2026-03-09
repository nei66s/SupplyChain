(async () => {
  const base = 'http://127.0.0.1:9002'
  try {
    const res = await fetch(base + '/api/production')
    if (!res.ok) {
      console.error('GET /api/production failed', res.status)
      process.exit(2)
    }
    const tasks = await res.json()
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.log('NO_TASKS_CREATING_ONE')
      const createRes = await fetch(base + '/api/production', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: 'O-1', materialId: 'M-1', qtyToProduce: 1 }),
      })
      if (!createRes.ok) {
        console.error('CREATE_FAILED', createRes.status)
        process.exit(4)
      }
      const created = await createRes.json()
      console.log('CREATED', JSON.stringify(created))
      // reload tasks
      const res2 = await fetch(base + '/api/production')
      const tasks2 = await res2.json()
      if (!Array.isArray(tasks2) || tasks2.length === 0) {
        console.error('NO_TASKS_AFTER_CREATE')
        process.exit(5)
      }
      var id = tasks2[0].id
    } else {
      var id = tasks[0].id
    }
    console.log('FOUND_TASK', id)

    const patch = await fetch(base + `/api/production/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    console.log('PATCH_STATUS', patch.status)
    const patched = await patch.json()
    console.log('PATCHED', JSON.stringify(patched))

    const inv = await fetch(base + '/api/inventory')
    console.log('INVENTORY_STATUS', inv.status)
    const invjson = await inv.json()
    console.log(JSON.stringify(invjson, null, 2))
  } catch (e) {
    console.error('ERR', e)
    process.exit(3)
  }
})()
