'use client';
import List from "../common/List"
import CategoryList from "../common/CategoryList";
import { useState } from "react";
import ToggleSwitch from "../common/ToggleSwitch";
import Button from "../common/Button";
import { IoSunny as LightIcon, IoMoon as DarkIcon } from "react-icons/io5";
import ChangeUsernameDialog from "../common/dialog/ChangeUsernameDialog";

export default function SettingsList() {
    const [showCategory, setShowCategory] = useState(false);
    const [showUsername, setShowUsername] = useState(false);
    const [themeSwitch, setThemeSwitch] = useState(false);
    const [theme, setTheme] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [deleteAccount, setDeleteAccount] = useState(false);
    
    const SETTING_ITEMS = [
        {
            id: 'change-username',
            title: 'Change username',
            description: 'Set a new username',
            onClick: () => setShowUsername(true)
        },
        {
            id: 'category',
            title: 'Category',
            description: 'Manage your categories',
            onClick: () => setShowCategory(true)
        },
        {
            id: 'theme',
            title: 'Theme',
            description: 'Set theme preferences',
            control: <ToggleSwitch icon={themeSwitch ? <DarkIcon className="text-sm md:text-base"/> : <LightIcon className="text-sm md:text-base"/>} switchStatus={themeSwitch}/>,
            onClick: () => setThemeSwitch(!themeSwitch)
        },
        {
            id: 'import-data',
            title: 'Import Data',
            description: 'Import user data',
            onClick: () => setShowImport(true) // TODO: import user data
        },
        {
            id: 'export-data',
            title: 'Export Data',
            description: 'Export user data',
            onClick: () => setShowCategory(true) // TODO: export user data
        },
        {
            id: 'download',
            title: 'Download',
            description: 'Install app on device',
            onClick: () => setShowCategory(true)
        },
        {
            id: 'about-app',
            title: 'About App',
            description: 'App version and description',
            onClick: () => setShowAbout(true)
        }
    ]

    return(
        <>
            <List items={SETTING_ITEMS}/>
            <CategoryList
                show={showCategory}
                hideFn={() => setShowCategory(false)}
            />
            <Button style="danger" label={"Delete Account"} onClick={() => setDeleteAccount(true)} className="mt-8"/>
            <ChangeUsernameDialog
                show={showUsername}
                hideFn={() => setShowUsername(false)}
            />
        </>
    )
}