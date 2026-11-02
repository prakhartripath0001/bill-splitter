import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ status: 'ok' }))

//create a new home 
app.post('/api/homes', async (c) => {
    let body : {name?: unknown}

    try {
        body = await c.req.json<{name ?: unknown}>()
    } catch {
        return c.json({ error : 'invalid json body'}, 400)
    }

    if (typeof body.name !== 'string'|| body.name.trim().length === 0 ) {
        return c.json({ error : 'Home name is required and cannot be empty'}, 400)
    }

    const name = body.name.trim()

    try {
        const home = await c.env.DB.prepare('INSERT INTO homes (name) VALUES (?) RETURNING id, name').bind(name).first<{id: number, name: string}>()

        if (!home) {
            return c.json({ error : 'Failed to create home'}, 500)
        }

        return c.json(
            {
                id: String(home.id),
                name: home.name
            }, 201,
        )
    } catch {
        return c.json({ error : 'Failed to create home'}, 500)
    }
})

//create a new member inside an existing home
app.post('/api/homes/:homeId/members', async (c) => {
    let body : {name?: unknown}

    try {
        body = await c.req.json<{name ?: unknown}>()    
    } catch {
        return c.json({ error : 'invalid json body'}, 400)
    }

    if (typeof body.name !== 'string'|| body.name.trim().length === 0 ) {
        return c.json({ error : 'Member name is required and cannot be empty'}, 400)
    }

    const homeId = Number(c.req.param('homeId'))

    if (!Number.isSafeInteger(homeId) || homeId <= 0) {
        return c.json({ error : 'Home not found with this id'}, 404)
    }

    const name = body.name.trim()

    try {
        const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first<{id: number}>()
        
        if (!home) {
            return c.json({ error : 'Home not found with this id'}, 404)
        }

        const member = await c.env.DB.prepare('INSERT INTO members (home_id, name) VALUES (?, ?) RETURNING id, home_id, name').bind(homeId, name).first<{id: number, home_id: number, name: string}>()
        
        if (!member) {
            return c.json({ error : 'Failed to create member'}, 500)
        }

        return c.json(
            {
                id: String(member.id),
                homeId: String(member.home_id),
                name: member.name
            }, 201,
        )
    } catch {
        return c.json({ error : 'Failed to create member'}, 500)
    }
})

export default app
