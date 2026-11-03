export interface Home {
  id: string
  name: string
}

export interface Member {
  id: string
  homeId: string
  name: string
}

export interface Share {
    id: string
    memberId: string
    memberName: string
    amountCents: number
    paidAt: string | null
}

export interface Bill {
  id: string
  title: string
  totalCents: number
  shares: Share[]
}

interface BillsResponse {
  bills: Bill[]
}

export class ApiError extends Error {
    constructor(message : string, public status : number) {
        super(message)
        this.name = "ApiError"
    }    
}

async function handleResponse<T>(response : Response) : Promise<T> {
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
        throw new ApiError(data?.error || data?.message || 'something went wrong' , response.status);
    }

    return data as T;
}

export async function createHome(name: string): Promise<Home> {
  const response = await fetch('/api/homes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })

  return handleResponse<Home>(response)
}


export async function addMember(homeId: string,name: string,): Promise<Member> {
  const response = await fetch(`/api/homes/${homeId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })

  return handleResponse<Member>(response)
}

export async function createBill(homeId: string, title: string,totalCents: number,): Promise<Bill> {
  const response = await fetch(`/api/homes/${homeId}/bills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, totalCents }),
  })

  return handleResponse<Bill>(response)
}

export async function getBills(homeId : string) : Promise<Bill[]> {
    const response = await fetch(`/api/homes/${homeId}/bills` )
    const data = await handleResponse<BillsResponse>(response)
    return data.bills
}

export async function payShare(billId : string, shareId : string) : Promise<Share> {
    const response = await fetch(`/api/bills/${billId}/shares/${shareId}/pay`, {
        method: 'POST',
        headers: {
            'Idempotency-Key': crypto.randomUUID(),
        }
    })
    
    return handleResponse<Share>(response)
}