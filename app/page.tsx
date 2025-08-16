import { IndexCard } from '@/components/index-card';

const data = [
  {
    index: {
      id: '0',
      code: '800401',
      name: 'Cash Index',
    },
    purchases: [
      {
        id: '0',
        user: { id: '0', first: 'John', last: 'Doe' },
        accountId: '0',
        description: 'Graduation stoles for seniors',
        amount: 103.26,
      },
      {
        id: '0',
        user: { id: '0', first: 'Jane', last: 'Foster' },
        accountId: '0',
        description: 'Fabuletta replacement part',
        amount: 14.97,
      },
    ],
  },
];

export default function Home() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {data.map((v, i) => (
        <IndexCard key={i} index={v.index} purchases={v.purchases} />
      ))}
    </div>
  );
}
