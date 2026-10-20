Wallet module

- WalletPage.tsx: shows balance and transactions, supports sandbox top-up.
- Transactions include balance_after field. Top-up updates wallet balance and inserts a transaction.

Supabase migrations were prepared to add wallets, transactions, platform_settings, vehicle_logs and sos_alerts; they are waiting for approval in the Database panel.