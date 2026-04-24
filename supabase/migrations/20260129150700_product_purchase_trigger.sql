-- Database Trigger for Product Purchase Email Notifications
CREATE OR REPLACE FUNCTION notify_product_purchase()
RETURNS TRIGGER AS $$
DECLARE
    v_product_title TEXT;
    v_access_link TEXT;
BEGIN
    -- Only trigger on status change from pending to paid
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        
        -- Get product title
        SELECT title INTO v_product_title
        FROM digital_products
        WHERE id = NEW.product_id;
        
        -- Construct access link
        v_access_link := 'https://yourdomain.com/view/' || NEW.access_token::text;
        
        -- Call edge function to send email/notification
        PERFORM net.http_post(
            url := current_setting('app.supabase_functions_url') || '/send-product-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
            ),
            body := jsonb_build_object(
                'purchase_id', NEW.id,
                'customer_email', NEW.customer_email,
                'customer_name', NEW.customer_name,
                'customer_phone', NEW.customer_phone,
                'product_title', v_product_title,
                'amount', NEW.amount,
                'access_token', NEW.access_token,
                'access_link', v_access_link
            )
        );
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_product_purchase_paid ON product_purchases;
CREATE TRIGGER on_product_purchase_paid
    AFTER UPDATE ON product_purchases
    FOR EACH ROW
    EXECUTE FUNCTION notify_product_purchase();

-- Note: You'll need to set these runtime settings:
-- ALTER DATABASE postgres SET app.supabase_functions_url = 'https://your-project.supabase.co/functions/v1';
-- ALTER DATABASE postgres SET app.supabase_anon_key = 'your-anon-key';
