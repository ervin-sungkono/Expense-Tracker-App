import FileUploader from "../common/FileUploader";
import Button from "../common/Button";
import ToggleSwitch from "../common/ToggleSwitch";
import { db } from "@lib/db";
import { useState } from "react";
import { toast } from "react-toastify";

export default function ImportDataForm({ onFinishImport }) {
    const [replaceData, setReplaceData] = useState(false);
    const [clearData, setClearData] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const handleSubmit = async(e) => {
        e.preventDefault();
        if(isImporting) return;
        setErrorMessage(null);

        const form = e.target;
        const formData = new FormData(form);

        const file = formData.get('import-file');

        try {
            setIsImporting(true);
            await db.importDB({ file, clearTablesBeforeImport: clearData, overwriteValues: replaceData });
            toast.success("Import data success");
            onFinishImport && onFinishImport();
        } catch(error) {
            setErrorMessage(String(error));
            toast.error("Failed to import data");
            console.log(error);
        } finally {
            setIsImporting(false);
        }
    }

    return(
        <div className="flex flex-col gap-4">
            <div className="text-xl font-bold">{'Import Data'}</div>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 mb-6">
                    <FileUploader
                        label={"Database File"}
                        name={"import-file"}
                        dropzoneOptions={{
                            accept: { 'application/json': [] }
                        }}
                    />
                    <div className="flex flex-col gap-2 text-dark dark:text-white">
                        <p className="text-xs md:text-sm font-semibold">Replace existing data</p>
                        <ToggleSwitch onStatusChange={(status) => setReplaceData(status)}/>
                    </div>
                    <div className="flex flex-col gap-2 text-dark dark:text-white">
                        <p className="text-xs md:text-sm font-semibold">Clear all data before import</p>
                        <ToggleSwitch onStatusChange={(status) => setClearData(status)}/>
                    </div>
                </div>
                {isImporting && <p className="text-xs md:text-sm mb-2 animate-pulse text-center">Importing on progress..</p>}
                {errorMessage && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400 mb-2">{errorMessage}</p>}
                <Button type="submit" label={'Upload'}/>
            </form>
        </div>
    )
}