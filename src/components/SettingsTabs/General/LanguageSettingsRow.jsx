import { useState } from "react";
import {
  SettingsRow,
  SettingsCell,
  BoldLabel,
  InlineSelect,
  StyledLink,
  SettingsCheckbox,
  SettingsRadio,
} from "./styles";

export default function LanguageSettingsRow() {
  const selectedLang = "en";
  const [enableInputTools, setEnableInputTools] = useState(false);

  return (
    <SettingsRow>
      <SettingsCell width="20%" side="left">
        <BoldLabel>Language:</BoldLabel>
      </SettingsCell>
      <SettingsCell side="right">
        <div>
          <b>MailG display language:</b>{" "}
          <InlineSelect
            value={selectedLang}
            onChange={() => {
              // ignore any changes
            }}
          >
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
          </InlineSelect>{" "}
          <StyledLink href="#" target="_blank">
            Change language settings for other MailG products
          </StyledLink>
        </div>

        <div style={{ padding: "10px 0" }}>
          <SettingsCheckbox
            id="enable-input-tools"
            type="checkbox"
            checked={enableInputTools}
            onClick={(e) => e.preventDefault()}
          />
          <label htmlFor="enable-input-tools" style={{ marginLeft: "8px" }}>
            <BoldLabel>Enable input tools</BoldLabel> – Use various text input tools to type in the language of your
            choice
          </label>{" "}
          – <StyledLink as="span">Edit tools</StyledLink> –
          <StyledLink href="#" target="_blank">
            Learn more
          </StyledLink>
        </div>
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend className="sr-only">Right-to-left editing support</legend>

          <label>
            <SettingsRadio type="radio" name="rtl" checked={true} onClick={(e) => e.preventDefault()} />
            <BoldLabel style={{ marginLeft: "6px" }}>Right-to-left editing support off</BoldLabel>
          </label>

          <br />

          <label>
            <SettingsRadio type="radio" name="rtl" checked={false} onClick={(e) => e.preventDefault()} />
            <BoldLabel style={{ marginLeft: "6px" }}>Right-to-left editing support on</BoldLabel>
          </label>
        </fieldset>
      </SettingsCell>
    </SettingsRow>
  );
}
