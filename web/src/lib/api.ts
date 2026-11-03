export interface Share {
    id: String
    memberId: String
    memberName: String
    amountCents: Number
    paidAt: String | null
}

export interface Bill {
    id : String,
    title : String,
    totalCents : Number,
    shares : Share[]
}

interface BillsResponse {
    bills : Bill[]
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

export async function getBills(homeId : String) : Promise<Bill[]> {
    const response = await fetch(`/api/homes/${homeId}/bills` )
    const data = await handleResponse<BillsResponse>(response)
    return data.bills
}

export async function payShare(billId : String, shareId : String) : Promise<Share> {
    const response = await fetch(`/api/bills/${billId}/shares/${shareId}/pay`, {
        method: 'POST',
        headers: {
            'Idempotency-Key': crypto.randomUUID(),
        }
    })
    
    return handleResponse<Share>(response)
}