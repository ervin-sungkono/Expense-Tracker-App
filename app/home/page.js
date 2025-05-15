import Layout from "../_components/layout/Layout";
import Header from "../_components/home/Header";
import ExpenseData from "../_components/home/ExpenseData";
import ExpenseReport from "../_components/home/ExpenseReport";
import CategoriesCarousel from "../_components/home/CategoriesCarousel";
import ShopsCarousel from "../_components/home/ShopsCarousel";
import RecentExpenses from "../_components/home/RecentExpenses";

export default function Home() {
    return(
        <Layout pathname={"/home"}>
            <Header/>
            <ExpenseData/>
            <ExpenseReport/>
            <RecentExpenses/>
            <CategoriesCarousel/>
            <ShopsCarousel/>
        </Layout>
    )
}