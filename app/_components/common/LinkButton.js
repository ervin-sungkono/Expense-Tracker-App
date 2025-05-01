'use client'
import Button from "./Button";
import Link from "next/link";

export default function LinkButton({ href = '', disabled, ...params }) {
    return(
        <Link href={ disabled ? '#' : href}>
            <Button {...params}/>
        </Link>
    )
}