import Layout from "../_components/layout/Layout";
import Header from "../_components/home/Header";
import ExpenseData from "../_components/home/ExpenseData";

export default function Home() {
    return(
        <Layout pathname={"/home"}>
            <Header/>
            <ExpenseData/>
        </Layout>
    )
}