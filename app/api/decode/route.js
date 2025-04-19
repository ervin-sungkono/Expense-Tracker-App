import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

export async function POST(req) {
    const { token } = await req.body();
    let decoded = null;

    try {
        decoded = verify(token, process.env.JWT_SECRET);
    } catch(err) {
        console.log(e);
        return NextResponse.json({ data: 'Something went wrong' }, { status: 500 });
    }

    return NextResponse.json({ data: decoded }, { status: 200 });
}