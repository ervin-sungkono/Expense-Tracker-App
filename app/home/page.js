import Layout from "../_components/layout/Layout";
import Header from "../_components/home/Header";

export default function Home() {
    return(
        <Layout pathname={"/home"}>
            <Header/>
        </Layout>
    )
}