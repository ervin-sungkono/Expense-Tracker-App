import Image from "next/image"
import Link from "next/link"

export default function AppLogo({ 
    position = 'left', 
    className = ''
}) {
    return(
        <Link href={"/"} className={`flex ${className}`} style={{justifyContent: position}}>
            <Image width={150} height={43} quality={100} src={"/assets/logo-full.png"} alt="App Logo"/>
        </Link>
    )
}