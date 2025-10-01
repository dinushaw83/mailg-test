import {
    SettingsRow, SettingsCell,
    BoldLabel, InlineSelect, StyledLink,
    SettingsCheckbox, SettingsRadio, 
} from "./styles";


export default function LanguageSettingsRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Language:</BoldLabel>
            </SettingsCell>
            <SettingsCell side="right">
                <div>
                    <b>Gmail display language:</b>{" "}
                    <InlineSelect defaultValue="en">
                        <option value="af">Afrikaans</option>
                        <option value="az">Azərbaycanca</option>
                        <option value="id">Bahasa Indonesia</option>
                        <option value="ms">Bahasa Melayu</option>
                        <option value="ca">Català</option>
                        <option value="cs">Čeština</option>
                        <option value="cy">Cymraeg</option>
                        <option value="da">Dansk</option>
                        <option value="de">Deutsch</option>
                        <option value="et">Eesti keel</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="en">English (US)</option>
                        <option value="es">Español</option>
                        <option value="es-419">Español (Latinoamérica)</option>
                        <option value="fr">Français</option>
                        <option value="fr-CA">Français (Canada)</option>
                        <option value="hi">हिन्दी</option>
                        <option value="zh-CN">中文 (简体)</option>
                        <option value="zh-TW">中文 (繁體)</option>
                        <option value="ja">日本語</option>
                        <option value="ko">한국어</option>
                        {/* ... add the rest */}
                    </InlineSelect>{" "}
                    <StyledLink
                        href="https://myaccount.google.com/language"
                        target="_blank"
                    >
                        Change language settings for other Google products
                    </StyledLink>
                </div>

                <div style={{ padding: "10px 0" }}>
                    <SettingsCheckbox type="checkbox" defaultChecked />{" "}
                    <label>
                        <BoldLabel>Enable input tools</BoldLabel> – Use various text input
                        tools to type in the language of your choice
                    </label>{" "}
                    – <StyledLink as="span">Edit tools</StyledLink> –{" "}
                    <StyledLink
                        href="https://support.google.com/mail/answer/139576?hl=en-GB"
                        target="_blank"
                    >
                        Learn more
                    </StyledLink>
                </div>

                <div>
                    <label>
                        <SettingsRadio type="radio" name="rtl" defaultChecked />{" "}
                        <BoldLabel>Right-to-left editing support off</BoldLabel>
                    </label>
                    <br />
                    <label>
                        <SettingsRadio type="radio" name="rtl" />{" "}
                        <BoldLabel>Right-to-left editing support on</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
