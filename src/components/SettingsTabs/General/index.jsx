import React from "react";
import LanguageSettingsRow from "./LanguageSettingsRow";
import PageSizeRow from "./PageSizeRow";
import UndoSendRow from "./UndoSendRow";
import DefaultReplyBehaviourRow from "./DefaultReplyBehaviourRow";
import { HoverActionsRow } from "./HoverActionsRow";
import { SendAndArchiveRow } from "./SendAndArchiveRow";
import { DefaultTextStyleRow } from "./DefaultTextStyleRow";
import { ImagesRow } from "./ImagesRow";
import { DynamicEmailRow } from "./DynamicEmailRow";
import SpellingRow from "./SpellingRow";
import { AutoCorrectRow } from "./AutoCorrectRow";
import { SmartComposeRow } from "./SmartComposeRow";
import SmartComposePersonalisationRow from "./SmartComposePersonalisationRow";
import ConversationViewRow from "./ConversationViewRow";
import NudgesRow from "./NudgesRow";
import SmartReplyRow from "./SmartReplyRow";
import SmartFeaturesRow from "./SmartFeaturesRow";
import WorkspaceSmartFeaturesRow from "./WorkspaceSmartFeaturesRow";
import GrammarRow from "./GrammarRow";
import PackageTrackingRow from "./PackageTrackingRow";
import DesktopNotificationsRow from "./DesktopNotificationsRow";
import StarsRow from "./StarsRow";
import KeyboardShortcutsRow from "./KeyboardShortcutsRow";
import ButtonLabelsRow from "./ButtonLabelsRow";
import MyPictureRow from "./MyPictureRow";
import AutoCompleteContactsRow from "./AutoCompleteContactsRow";
import AdsImportanceSignalsRow from "./AdsImportanceSignalsRow";
import SignatureRow from "./Signature/SignatureRow";
import PersonalLevelIndicatorsRow from "./PersonalLevelIndicatorsRow";
import SnippetsRow from "./SnippetsRow";
import SettingsFooterRow from "./SettingsFooterRow";
import OutOfOfficeAutoReply from "./OutOfOfficeAutoReply";
import { Container, MainContainer, StyledTable, MainBody } from "./styles";

export default function GeneralSettings() {
    return (
        <Container>
            <MainContainer>
                <MainBody>
                    <StyledTable>
                        <tbody>
                            <LanguageSettingsRow />
                            <PageSizeRow />
                            <UndoSendRow />
                            <DefaultReplyBehaviourRow />
                            <HoverActionsRow />
                            <SendAndArchiveRow />
                            <DefaultTextStyleRow />
                            <ImagesRow />
                            <DynamicEmailRow />
                            <GrammarRow />
                            <SpellingRow />
                            <AutoCorrectRow />
                            <SmartComposeRow />

                            <SmartComposePersonalisationRow />
                            <ConversationViewRow />
                            <NudgesRow />

                            <SmartReplyRow />
                            <SmartFeaturesRow />
                            <WorkspaceSmartFeaturesRow />

                            <PackageTrackingRow />
                            <DesktopNotificationsRow />
                            <StarsRow />
                            <KeyboardShortcutsRow />

                            <ButtonLabelsRow />
                            <MyPictureRow />
                            <AutoCompleteContactsRow />
                            <AdsImportanceSignalsRow />
                            <SignatureRow />
                            <PersonalLevelIndicatorsRow />
                            <SnippetsRow />

                            <OutOfOfficeAutoReply />
                            <SettingsFooterRow />
                        </tbody>
                    </StyledTable>
                </MainBody>
            </MainContainer>
        </Container>
    )
}