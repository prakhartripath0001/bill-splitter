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

app.post('/api/bills/:billId/shares/:shareId/pay', async (c) => {
    const billId = Number(c.req.param('billId'))
    const shareId = Number(c.req.param('shareId'))

    const idempotencyKey = c.req.header('Idempotency-Key')?.trim()

    if (!idempotencyKey || idempotencyKey.length === 0) {
        return c.json({ error : 'Idempotency-Key header is required and cannot be empty'}, 400)
    }

    if (!Number.isSafeInteger(billId) || billId <= 0 || !Number.isSafeInteger(shareId) || shareId <= 0) {
        return c.json({ error : 'Bill or Share not found with this id'}, 404)
    }

    try {
        const bill = await c.env.DB.prepare('SELECT id FROM bills WHERE id = ?').bind(billId).first<{id: number}>()

        if (!bill) {
            return c.json({ error : 'Bill not found with this id'}, 404)
        }

        const share = await c.env.DB.prepare('SELECT id, member_id, amount_cents, paid_at, idempotency_key FROM shares WHERE id = ? AND bill_id = ?').bind(shareId, billId).first<{id: number, member_id: number, amount_cents: number, paid_at: string | null, idempotency_key: string | null}>()
        
        if (!share) {
            return c.json({ error : 'Share not found with this id'}, 404)
        }

        if (share.paid_at !== null) {
            if (share.idempotency_key !== idempotencyKey) {
                return c.json({ message : 'Share has already been paid with a different idempotency key'}, 409)
            }
            return c.json(
                {
                    id: String(share.id),
                    memberId: String(share.member_id),
                    amountCents: share.amount_cents,
                    paidAt: share.paid_at
                }, 200,
            )
        }
        const paidShare = await c.env.DB.prepare('UPDATE shares SET paid_at = CURRENT_TIMESTAMP, idempotency_key = ? WHERE id = ? AND bill_id = ? AND paid_at IS NULL RETURNING id, member_id, amount_cents, paid_at').bind(idempotencyKey, shareId, billId).first<{id: number, member_id: number, amount_cents: number, paid_at: string | null}>()
        if (paidShare) {
            return c.json(
                {
                    id: String(paidShare.id),
                    memberId: String(paidShare.member_id),
                    amountCents: paidShare.amount_cents,
                    paidAt: paidShare.paid_at
                }, 200,
            )
        }

        const curShare = await c.env.DB.prepare('SELECT id, member_id, amount_cents, paid_at, idempotency_key FROM shares WHERE id = ? AND bill_id = ?').bind(shareId, billId).first<{id: number, member_id: number, amount_cents: number, paid_at: string | null, idempotency_key: string | null}>()

        if (!curShare) { 
            return c.json({ error : 'Share not found with this id'}, 404)
        }

        if (curShare.paid_at !== null && curShare.idempotency_key === idempotencyKey) {
            return c.json(
                {
                    id: String(curShare.id),
                    memberId: String(curShare.member_id),
                    amountCents: curShare.amount_cents,
                    paidAt: curShare.paid_at
                }, 200,
            )
        }

        if (curShare.paid_at !== null) {
            return c.json({ message : 'Share has already been paid with a different idempotency key'}, 409)
        }

        return c.json({ error : 'Failed to pay share'}, 500)
    } catch {
        return c.json({ error : 'Failed to pay share'}, 500)
    }
})

export default app
