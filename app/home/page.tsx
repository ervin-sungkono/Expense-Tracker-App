import Layout from "@components/layout/Layout";
import Header from "@components/home/Header";
import TransactionData from "@components/home/TransactionData";
import TransactionReport from "@components/home/TransactionReport";
import CategoriesCarousel from "@components/home/CategoriesCarousel";
import ShopsCarousel from "@components/home/ShopsCarousel";
import RecentTransactions from "@components/home/RecentTransactions";

export default function Home() {
    return(
        <Layout pathname={"/home"}>
            <Header/>
            <TransactionData/>
            <TransactionReport/>
            <RecentTransactions/>
            <CategoriesCarousel/>
            <ShopsCarousel/>
        </Layout>
    )
}