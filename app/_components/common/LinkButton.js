'use client'
import Button from "./Button";
import Link from "next/link";

export default function LinkButton({ href = '', disabled, ...params }) {
    return(
        <Link scroll={false} href={ disabled ? '#' : href}>
            <Button {...params}/>
        </Link>
    )
}