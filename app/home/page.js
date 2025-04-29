import Layout from "../_components/layout/Layout";
import Header from "../_components/home/Header";
import ExpenseData from "../_components/home/ExpenseData";
import CategoriesCarousel from "../_components/home/CategoriesCarousel";
import ShopsCarousel from "../_components/home/ShopsCarousel";

export default function Home() {
    return(
        <Layout pathname={"/home"}>
            <Header/>
            <ExpenseData/>
            <CategoriesCarousel/>
            <ShopsCarousel/>
        </Layout>
    )
}