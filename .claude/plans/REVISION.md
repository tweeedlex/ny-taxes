## Frontend
ALl changes are only on frontend, do not modify the backend

### Orders page

Таблиця замовлень

1. Rework pagination
- Add the ability to enter the page number
- Add the pagination component to the top of the table, under filters, so users don't have to scroll all the way down to navigate pages
- Numbers of the pages should be that so user can easily navigate to the end of the table, to the start, to next page, last page, and to the page number they want to go to

2. Remove breakdown column, as we already have breakdown when clicking the row
3. Add coordinates column as button, with link to google maps
4. Rename code column to reporting code
5. Add sorting to the table
   GET /orders via query param `sort` options:
   - newest (default)
   - oldest
   - subtotal_asc
   - subtotal_desc
   - tax_asc
   - tax_desc

### CSV Import page

Таблиця завдань

1. ID показувати нормально
• Замість “три крапки”/кривого обрізання зробити формат як на macos назви файлів типу:
d39656...d39656.csv
• зробити клікабельним лінком на файл з поля file_path з ендпоінта /orders/import/tasks

2. Progress bars / лічильники 
Переробити прогресбар, розтягнути ширше, зробити 3 кольори: success (зелений), in progress (сірий), error (червоний)
І на прогрес барі відображати шоб було видно типу у відсотках скільки вже оброблено, скільки з помилкою, а скільки залишилось.

3. Саму таблицю зробити адаптивною, шоб ужималась та скролилась по горизонталі на менших екранах

### General

1. Add a favicon to the app (e.g. a tax document icon) for better branding and easier tab identification.
2. Add Restrict component and make restrictions based on user authorities (e.g. hide Import page from users without `edit_orders`) authority).
Here is example of Restrict from other app:
``` tsx
import React, { FC } from 'react';
import { useUserState } from "@/store/user";
import { AUTHORITIES } from "@/constants/api";

type ValueOf<T> = T[keyof T];

interface RestrictProps {
    authorities: ValueOf<typeof AUTHORITIES>[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const Restrict: FC<RestrictProps> = ({ authorities, children, fallback }) => {
    const user = useUserState(s => s.user);
    
    if (
        !user ||
        !authorities.every(authority =>
        ((user.authorities as (ValueOf<typeof AUTHORITIES>[]) | undefined)?.includes(authority) ?? false)
    )
    ) {
        return fallback;
    }

    return children;
};

export default Restrict;
```