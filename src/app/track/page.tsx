import OrderTracker from "@/components/order-tracker";

export default async function TrackOrderPage({ searchParams }: PageProps<"/track">) {
  const { reference } = await searchParams;
  return <OrderTracker initialReference={typeof reference === "string" ? reference : ""} />;
}