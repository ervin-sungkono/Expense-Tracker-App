'use client'
import Button from "./Button";
import Link from "next/link";

export default function LinkButton({ href = '', ...params }) {
    return(
        <Link href={href}>
            <Button {...params}/>
        </Link>
    )
}