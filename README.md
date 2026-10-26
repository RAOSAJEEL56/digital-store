# Digital Store

A responsive React + Tailwind point-of-sale and store-management app based on the supplied Digital Store HTML.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run lint` to check the source.

## Pages

- **Billing** — Search products, build a cart, apply a discount, choose cash/digital/udhar, and complete a sale.
- **Stock** — Add, edit, search, remove and restock products.
- **Sales history** — Search bills and filter by payment type.
- **Udhar / Khata** — View pending customer balances and record partial or full payments.
- **Online payments** — Review digital sales and repayments by date range and account.
- **Profit** — Compare sales, product cost and profit by bill.
- **Analytics** — Review sales metrics, popular products and low-stock alerts.
- **Settings** — Configure store/account details and export, restore or reset local data.

The shared header, navigation and footer are in `src/components/common/`. Page routes are configured in `src/App.jsx`. Store records are persisted in this browser's local storage and use the original `kiryana_*` storage keys when available.
