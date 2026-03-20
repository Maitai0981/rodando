UPDATE orders
SET payment_method = 'card_credit'
WHERE payment_method = 'paypal';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('google_pay', 'card_credit', 'card_debit', 'pix'));
