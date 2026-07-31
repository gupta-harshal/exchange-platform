import { api } from "../api/client";
import { formatPrice, formatQty } from "../utils/format";
import type { OpenOrder } from "../types";

type Props = {
  orders: OpenOrder[];
  market: string;
  onChanged: () => void;
};

export function OpenOrders({ orders, market, onChanged }: Props) {
  const cancel = async (orderId: string) => {
    await api.cancelOrder(orderId, market);
    onChanged();
  };

  return (
    <section className="panel open-orders">
      <header className="panel-header">
        <h2>Open Orders</h2>
        <span className="muted">{orders.length}</span>
      </header>

      {orders.length === 0 ? (
        <p className="empty">No resting orders</p>
      ) : (
        <div className="table">
          <div className="table-head">
            <span>Side</span>
            <span>Price</span>
            <span>Qty</span>
            <span>Filled</span>
            <span></span>
          </div>
          {orders.map((o) => (
            <div key={o.orderId} className="table-row">
              <span className={o.side}>{o.side.toUpperCase()}</span>
              <span>{formatPrice(o.price, 1)}</span>
              <span>{formatQty(o.quantity, 2)}</span>
              <span>{formatQty(o.filled, 2)}</span>
              <button type="button" className="ghost" onClick={() => cancel(o.orderId)}>
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
