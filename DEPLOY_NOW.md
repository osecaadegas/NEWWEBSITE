# CRITICAL: Run These SQL Migrations NOW

## 🔴 DEPLOYMENT STEPS (DO IN ORDER)

### Step 1: Run Layout Columns Migration (CRITICAL)
**Open Supabase SQL Editor** → Paste this entire file:
**File:** `migrations/fix_widgets_layout_columns.sql`

This adds the missing `height`, `width`, `position_x`, `position_y`, `scale`, `opacity` columns.

### Step 2: Run RLS Policy Update (IMPORTANT)
**Open Supabase SQL Editor** → Paste this entire file:
**File:** `migrations/fix_widgets_rls_policies.sql`

This fixes INSERT permissions so widgets can be created.

### Step 3: Verify Schema
Run this query to confirm columns exist:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'widgets'
ORDER BY ordinal_position;
```

**Expected columns:**
- `position_x` (integer, not null, default 50)
- `position_y` (integer, not null, default 50)
- `width` (integer, not null, default 300)
- `height` (integer, not null, default 100)
- `scale` (numeric(3,2), not null, default 1.0)
- `opacity` (numeric(3,2), not null, default 1.0)

### Step 4: Test Widget Creation
In your dashboard:
1. Navigate to **Widgets** tab
2. Click **"Add Widget"**
3. Select any widget type
4. Widget should add without errors

**If error persists:**
- Check browser console for exact error message
- Verify migrations ran successfully
- Check Supabase logs for RLS policy failures

---

## ✅ VERIFICATION CHECKLIST

After running migrations:

- [ ] No `height column` error in console
- [ ] Widget adds successfully in dashboard
- [ ] Widget appears in "Active Widgets" list
- [ ] Widget renders in OBS overlay
- [ ] Drag/resize updates position
- [ ] Changes sync to OBS in realtime

---

## 🚨 IF MIGRATIONS FAIL

### Error: "column already exists"
**Solution:** Columns already added. Skip Step 1, proceed to Step 2.

### Error: "policy already exists"
**Solution:** Run this to drop and recreate:
```sql
DROP POLICY IF EXISTS "users can manage own widgets" ON widgets;
-- Then run fix_widgets_rls_policies.sql
```

### Error: "violates not-null constraint"
**Solution:** Existing widgets need migration. Run:
```sql
UPDATE widgets
SET position_x = COALESCE((position->>'x')::integer, 50),
    position_y = COALESCE((position->>'y')::integer, 50),
    width = COALESCE((size->>'width')::integer, 300),
    height = COALESCE((size->>'height')::integer, 100),
    scale = 1.0,
    opacity = 1.0
WHERE position_x IS NULL;
```

---

## 📊 CURRENT STATUS

**Frontend:** ✅ Deployed to production (https://www.osecaadegas.pt)
**Backend:** ⚠️ Awaiting database migration (YOU MUST RUN SQL)

**The frontend code is already live and expects these columns to exist.**
**Widget creation will fail until you run the migrations.**

---

*Run migrations immediately to restore widget functionality.*
