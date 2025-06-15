'use client';
import dynamic from "next/dynamic";
import List from "../common/List"
import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { db } from "@/app/_lib/db";
import { saveAs } from "file-saver";
import ThemeSwitch from "../common/ThemeSwitch";
import Dialog from "../common/Dialog";
import CategoryListPage from "../common/page/CategoryListPage";
import AboutAppPage from "../common/page/AboutAppPage";
// import ChangeCurrencyDialog from "./ChangeCurrencyDialog";

const ImportDataForm = dynamic(() => import("./ImportDataForm"));
const DeleteAccountForm = dynamic(() => import("./DeleteAccountForm"));
const ChangeUsernameForm = dynamic(() => import("./ChangeUsernameForm"));

export default function SettingsList() {
    const [showCategory, setShowCategory] = useState(false);
    const [showUsername, setShowUsername] = useState(false);
    // const [showCurrency, setShowCurrency] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [deleteAccount, setDeleteAccount] = useState(false);

    const [isExporting, setIsExporting] = useState(false);
    const [exportDescription, setExportDescription] = useState(null);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [installDisable, setInstallDisable] = useState(false);

    const switchRef = useRef(null);

    const exportCallback = ({ totalRows, completedRows, done }) => {
        setExportDescription(`${completedRows} out of ${totalRows} rows downloaded.`)
        if(done) {
            setExportDescription(null);
        }
    }

    const handleExportData = async() => {
        if(isExporting) return;

        setIsExporting(true);
        const exportedData = await db.exportDB({ progressCallback: exportCallback });
        // Decided not to encode the data as JWT for several reasons:
        // 1. Size is larger when encoded
        // 2. Takes longer time to encode because hitting API, tested on mid and low devices needs > 30 seconds.
        // 3. Encoding doesn't work when offline
        setIsExporting(false);

        saveAs(exportedData, `transaction-tracker-export_${new Date().getTime()}.json`);
    }

    function disableInAppInstallPrompt() {
        setInstallPrompt(null);
        setInstallDisable(true);
    }

    const beforeInstallPromptListener = (event) => {
        event.preventDefault();
        setInstallPrompt(event);
        setInstallDisable(false);
    }

    const appInstalledListener = () => {
        disableInAppInstallPrompt();
    }

    const installApp = async() => {
        if (!installPrompt) {
            return;
        }
        await installPrompt.prompt();

        disableInAppInstallPrompt();
    }

    useEffect(() => {
        window.addEventListener("beforeinstallprompt", beforeInstallPromptListener);
        window.addEventListener("appinstalled", appInstalledListener);

        return () => {
            window.removeEventListener("beforeinstallprompt", beforeInstallPromptListener);
            window.removeEventListener("appinstalled", appInstalledListener);
        }
    }, [])
    
    const SETTING_ITEMS = [
        {
            id: 'change-username',
            title: 'Change username',
            description: 'Set a new username',
            onClick: () => setShowUsername(true)
        },
        // {
        //     id: 'change-currency',
        //     title: 'Change currency',
        //     description: 'Use a different currency',
        //     onClick: () => setShowCurrency(true)
        // },
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
            onClick: () => {
                switchRef.current?.toggle();
            },
            control: <ThemeSwitch ref={switchRef}/>
        },
        {
            id: 'import-data',
            title: 'Import Data',
            description: 'Import user data',
            onClick: () => setShowImport(true), // TODO: import user data
            // disabled: !isOnline,
        },
        {
            id: 'export-data',
            title: 'Export Data',
            description: exportDescription ?? 'Export user data',
            onClick: handleExportData
        },
        {
            id: 'download',
            title: 'Download',
            description: 'Install app on device',
            onClick: installApp,
            disabled: !installPrompt || installDisable
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
            <CategoryListPage
                show={showCategory}
                hideFn={() => setShowCategory(false)}
            />
            <Button style="danger" label={"Delete Account"} onClick={() => setDeleteAccount(true)} className="mt-8 pb-4"/>
            <Dialog
                show={showUsername}
                hideFn={() => setShowUsername(false)}
            >
                <ChangeUsernameForm onSubmit={() => setShowUsername(false)}/>
            </Dialog>
            {/* <ChangeCurrencyDialog
                show={showCurrency}
                hideFn={() => setShowCurrency(false)}
            /> */}
            <Dialog
                show={showImport}
                hideFn={() => setShowImport(false)}
            >
                <ImportDataForm onFinishImport={() => setShowImport(false)}/>
            </Dialog>
            <Dialog
                show={deleteAccount}
                hideFn={() => setDeleteAccount(false)}
                hideCancelButton
            >
                <DeleteAccountForm onCancel={() => setDeleteAccount(false)}/>
            </Dialog>
            <AboutAppPage
                show={showAbout}
                hideFn={() => setShowAbout(false)}
            />
        </>
    )
}