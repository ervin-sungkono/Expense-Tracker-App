import { IoMdHome as HomeIcon, IoMdAdd as PlusIcon, IoMdSettings as SettingIcon } from "react-icons/io";
import { IoList as ListIcon, IoStorefront as StoreIcon } from "react-icons/io5";

// navbar items
export const NAV_ITEMS = [
    {
        label: 'Home',
        icon: <HomeIcon size={24}/>,
        url: '/home'
    },
    {
        label: 'Expenses',
        icon: <ListIcon size={24}/>,
        url: '/expenses'
    },
    {
        label: 'Add Expense',
        icon: <PlusIcon size={28}/>
    },
    {
        label: 'Shops',
        icon: <StoreIcon size={24}/>,
        url: '/shops'
    },
    {
        label: 'Settings',
        icon: <SettingIcon size={24}/>,
        url: '/settings'
    }
]

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
]