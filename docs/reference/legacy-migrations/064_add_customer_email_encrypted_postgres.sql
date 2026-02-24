-- 064: credit_purchase_logs에 customer_email_encrypted 칼럼 추가
-- 결제 시 고객이 입력한 이메일을 암호화하여 저장
-- 영향: stripe-webhook.js, checkout.js, invoice.js

ALTER TABLE credit_purchase_logs
ADD COLUMN IF NOT EXISTS customer_email_encrypted TEXT;

-- 인덱스: 이메일 기반 조회 지원 (인보이스 발급 등)
CREATE INDEX IF NOT EXISTS idx_cpl_customer_email_encrypted
ON credit_purchase_logs (customer_email_encrypted)
WHERE customer_email_encrypted IS NOT NULL;
