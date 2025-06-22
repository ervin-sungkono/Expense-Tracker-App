'use client'
import Dialog from "../common/Dialog";
import SelectField from "../common/SelectField";
import { useEffect, useState } from "react";
import Button from "../common/Button";
import { StringValidator } from "@/app/_lib/validator";
import { useLocalStorage } from "@/app/_lib/hooks";
import { getSupportedCurrencies } from "@/app/_lib/currency";

export default function ChangeCurrencyDialog({ show, hideFn }) {
    const [errorMessage, setErrorMessage] = useState({});
    const [_currency, setCurrency] = useLocalStorage('currency', 'IDR');
    const [currencyList, setCurrencyList] = useState([]);

    useEffect(() => {
        const supportedCurrencies = getSupportedCurrencies();
        setCurrencyList(supportedCurrencies.map(currency => ({id: currency, label: currency})));
    }, [])

    const validateCurrency = (currency) => {
        return new StringValidator("Currency", currency)
            .required()
            .validate();
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        // Create payload for add transaction
        const payload = {}
        for(const [key, value] of formData.entries()) {
            payload[key] = value;
        }

        try{
            let error = {};
            const { currency } = payload;

            error.currency = validateCurrency(currency);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            setCurrency(currency);
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
        }
    }

    return (
        <Dialog 
            show={show} 
            hideFn={hideFn}
        >
            <div className="flex flex-col gap-4">
                <div className="text-xl font-bold">{'Change Currency'}</div>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4 mb-6">
                        <SelectField
                            required
                            label={"Currency"}
                            name={"currency"}
                            _selected={_currency}
                            placeholder={"Select Currency"}
                            _options={currencyList}
                        />
                    </div>
                    <Button type="submit" label={'Update'}/>
                </form>
            </div>
        </Dialog>
    )
}