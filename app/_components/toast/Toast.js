'use client'
import { ToastContainer, Bounce } from "react-toastify";

export default function ToastComponent() {
    return(
        <ToastContainer
            position="bottom-right"
            autoClose={1500}
            pauseOnFocusLoss
            draggable
            transition={Bounce}
        />
    )
}