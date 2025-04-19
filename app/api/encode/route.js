import { NextResponse } from "next/server";
import { sign } from "jsonwebtoken";

export async function POST(req) {
    const { data } = await req.body();

    let resultToken = null;
    try{
        const payload = {
            ...data,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
        }

        resultToken = sign(JSON.stringify(payload), process.env.JWT_SECRET);
    } catch(e) {
        console.log(e);
        return NextResponse.json({ data: 'Something went wrong' }, { status: 500 });
    }

    return NextResponse.json({ data: resultToken }, { status: 200 });
}