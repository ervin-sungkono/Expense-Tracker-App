'use client'
import Button from "./Button";

export default function IconButton({ icon, onClick, contained = false }) {
    return(
        <Button onClick={onClick} size='icon' contained={contained} label={icon}/>
    )
}