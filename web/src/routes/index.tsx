import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ApiError,
  addMember,
  type Bill,
  createBill,
  createHome,
  getBills,
  payShare,
} from '../lib/api'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [homeId, setHomeId] = useState('1')
  const [homeName, setHomeName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [billTitle, setBillTitle] = useState('')
  const [totalCents, setTotalCents] = useState('')
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payingShareId, setPayingShareId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)

  async function refreshBills(id: string) {
    try {
      const data = await getBills(id)
      setBills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills')
    }
  }

  async function handleCreateHome() {
    if (!homeName.trim()) {
      setError('Please enter a home name')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const home = await createHome(homeName.trim())
      setHomeId(home.id)
      setHomeName('')
      setBills([])
      setMessage(`Home created successfully. Home ID: ${home.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create home')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMember() {
    if (!homeId.trim() || !memberName.trim()) {
      setError('Enter a home ID and member name')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await addMember(homeId, memberName.trim())
      setMemberName('')
      await refreshBills(homeId)
      setMessage('Member added successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateBill() {
    const cents = Number(totalCents)

    if (!homeId.trim() || !billTitle.trim()) {
      setError('Enter a home ID and bill title')
      return
    }

    if (!/^[0-9]+$/.test(totalCents)) {
      setError('Amount must be a whole number of cents')
      return
    }

    if (!Number.isSafeInteger(cents) || cents <= 0) {
      setError('Amount must be a positive whole number of cents')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await createBill(homeId, billTitle.trim(), cents)
      setBillTitle('')
      setTotalCents('')
      await refreshBills(homeId)
      setMessage('Bill created and split successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bill')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadBills() {
    if (!homeId.trim()) {
      setError('Please enter a home ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await getBills(homeId.trim())
      setBills(data)
    } catch (err) {
      setBills([])
      setError(err instanceof Error ? err.message : 'Failed to load bills')
    } finally {
      setLoading(false)
    }
  }

  async function handlePay(billId: string, shareId: string) {
    setPayingShareId(shareId)
    setError('')

    try {
      const updatedShare = await payShare(billId, shareId)

      setBills((currentBills) =>
        currentBills.map((bill) => ({
          ...bill,
          shares: bill.shares.map((share) => {
            if (share.id === updatedShare.id) {
              return updatedShare
            }
            return share
          }),
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPayingShareId(null)
    }
  }

  return (
    <main style={{ maxWidth: 850, margin: '40px auto', padding: 20 }}>
      <h1>Bill Splitter</h1>
      <p>Manage your home expenses and track payments.</p>

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" style={{ color: 'green' }}>
          {message}
        </p>
      )}

      <section style={{ border: '1px solid #ddd', padding: 20, marginBottom: 20 }}>
        <h2>Create Home</h2>
        <input
          value={homeName}
          onChange={(e) => setHomeName(e.target.value)}
          placeholder="Enter home name"
        />
        <button onClick={handleCreateHome} disabled={loading}>
          Create Home
        </button>
      </section>

      <section style={{ border: '1px solid #ddd', padding: 20, marginBottom: 20 }}>
        <h2>Select Home</h2>
        <input
          value={homeId}
          onChange={(e) => setHomeId(e.target.value)}
          placeholder="Enter Home ID"
        />
        <button onClick={handleLoadBills} disabled={loading}>
          Load Home
        </button>
      </section>

      {homeId && (
        <>
          <section style={{ border: '1px solid #ddd', padding: 20, marginBottom: 20 }}>
            <h2>Add Member</h2>
            <input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Enter member name"
            />
            <button onClick={handleAddMember} disabled={loading}>
              Add Member
            </button>
          </section>

          <section style={{ border: '1px solid #ddd', padding: 20, marginBottom: 20 }}>
            <h2>Add Bill</h2>
            <input
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="Bill title"
            />
            <input
              type="number"
              min="1"
              step="1"
              value={totalCents}
              onChange={(e) => setTotalCents(e.target.value)}
              placeholder="Total amount in cents"
            />
            <p>Example: 1000 cents = $10.00</p>
            <button onClick={handleCreateBill} disabled={loading}>
              Add Bill & Split
            </button>
          </section>
        </>
      )}

      <section>
        <h2>Bills</h2>

        {loading && <p>Loading...</p>}

        {!loading && bills.length === 0 && <p>No bills found.</p>}

        {bills.map((bill) => (
          <div key={bill.id} style={{ border: '1px solid #ddd', padding: 20, marginBottom: 15 }}>
            <h3>{bill.title}</h3>
            <p>
              Total: <strong>{formatMoney(bill.totalCents)}</strong>
            </p>

            {bill.shares.map((share) => (
              <div
                key={share.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderTop: '1px solid #eee',
                }}
              >
                <div>
                  <strong>{share.memberName}</strong>
                  <p>{formatMoney(share.amountCents)}</p>
                  <span>{share.paidAt ? 'Paid' : 'Unpaid'}</span>
                </div>

                {!share.paidAt && (
                  <button
                    onClick={() => handlePay(bill.id, share.id)}
                    disabled={payingShareId !== null}
                  >
                    {payingShareId === share.id ? 'Paying...' : 'Pay'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>
    </main>
  )
}
