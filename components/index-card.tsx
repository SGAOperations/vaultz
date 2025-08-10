import { Card } from "@/components/ui/card";

interface IndexCardProps {
    index: {
        id: string;
        code: string;
    },
    purchases: {
        id: string;
        user: {
            id: string;
            first: string;
            last: string;
        },
        accountId: string;
        description: string;
        amount: number;
    }[]
}

export function IndexCard({ index, purchases }: IndexCardProps) {
    return <Card>

    </Card>
}