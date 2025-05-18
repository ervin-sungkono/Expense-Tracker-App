import Layout from "../_components/layout/Layout";
import Header from "../_components/common/Header";
import SettingsList from "../_components/settings/SettingsList";

export default function Settings() {
    return(
        <Layout pathname={"/settings"}>
            <div className="h-full flex flex-col">
                <Header title={"Settings"} textAlign="center"/>
                <SettingsList/>
            </div>
        </Layout>
    )
}