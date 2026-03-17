-- 检查 cart 表是否存在
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'cart'
);

-- 如果存在，查看表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cart';

-- 查看 cart 表中的所有数据
SELECT * FROM cart;
