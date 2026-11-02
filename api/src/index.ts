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

app.post('/api/homes/:homeId/bills', async (c) => {
    let body : {title?: unknown, totalCents?: unknown}

    try {
        body = await c.req.json<{title ?: unknown, totalCents ?: unknown}>()
    } catch {
        return c.json({ error : 'invalid json body'}, 400)
    }

    //validate the bill title
    if (typeof body.title !== 'string'|| body.title.trim().length === 0 ) {
        return c.json({ error : 'Bill title is required and cannot be empty'}, 400)
    }

    //validate the bill total
    if (typeof body.totalCents !== 'number' || !Number.isSafeInteger(body.totalCents) || body.totalCents <= 0) {
        return c.json({ error : 'Total cents is required and must be a positive integer'}, 422)
    }

    const homeId = Number(c.req.param('homeId'))

    if (!Number.isSafeInteger(homeId) || homeId <= 0) {
        return c.json({ error : 'Home not found with this id'}, 404)
    }

    const title = body.title.trim()
    
    try {
        const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first<{id: number}>()

        if (!home) {
            return c.json({ error : 'Home not found with this id'}, 404)
        }

        const {results : members} = await c.env.DB.prepare('SELECT id FROM members WHERE home_id = ? order by id').bind(homeId).all<{id: number}>()

        if (members.length === 0) {
            return c.json({ error : 'Cannot create bill without members in the home'}, 422)
        }

        const baseShare = Math.floor(body.totalCents / members.length)
        const remainder = body.totalCents % members.length

        const bill = await c.env.DB.prepare('INSERT INTO bills (home_id, title, total_cents) VALUES (?, ?, ?) RETURNING id, home_id, title, total_cents').bind(homeId, title, body.totalCents).first<{id: number, home_id: number, title: string, total_cents: number}>()
        
        if (!bill) {
            return c.json({ error : 'Failed to create bill'}, 500)
        }

        const shares : {
            id: string,
            memberId: string,
            amountCents: number,
            paidAt: string | null
        }[] = []

        try {
            for (const [index, member] of members.entries()) {
                const amountCents = baseShare + (index < remainder ? 1 : 0)
                
                const share = await c.env.DB.prepare('INSERT INTO shares (bill_id, member_id, amount_cents, paid_at) VALUES (?, ?, ?, NULL) RETURNING id, member_id, amount_cents, paid_at').bind(bill.id, member.id, amountCents).first<{id: number, member_id: number, amount_cents: number, paid_at: string | null}>()
                
                if (!share) {
                    throw new Error('Failed to create bill shares')
                }

                shares.push({
                    id: String(share.id),
                    memberId: String(share.member_id),
                    amountCents: share.amount_cents,
                    paidAt: share.paid_at
                })

            } 
        } catch {
            await c.env.DB.prepare('DELETE FROM bills WHERE id = ?').bind(bill.id).run()

            return c.json({ error : 'Failed to create bill shares'}, 500)
        }

        return c.json(
            {
                id: String(bill.id),
                homeId: String(bill.home_id),
                title: bill.title,
                totalCents: bill.total_cents,
                shares
            }, 201,
        )

    } catch {
        return c.json({ error : 'Failed to create bill'}, 500)
    }
})

export default app
