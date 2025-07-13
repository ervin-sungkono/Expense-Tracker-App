import Layout from "@components/layout/Layout";
import Header from "@components/common/Header";
import SettingsList from "@components/settings/SettingsList";

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