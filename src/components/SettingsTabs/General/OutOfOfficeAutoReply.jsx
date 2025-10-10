import React, { useState, useEffect } from "react";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import VacationResponder from "../VacationResponder";

export default function OutOfOfficeAutoReply({
    localSettings,
    setLocalSettings
}) {
    const { vacationResponder } = useGlobalContext();

    const [localVacationResponder, setLocalVacationResponder] = useState(vacationResponder);

    // Initialize local settings from global context (which is already persisted)
    useEffect(() => {
        setLocalVacationResponder(vacationResponder);
    }, [vacationResponder]);

    useEffect(() => {
        setLocalSettings(localVacationResponder);
    }, [localVacationResponder])

    return (
        <VacationResponder
            localSettings={localVacationResponder}
            setLocalSettings={setLocalVacationResponder}
        />
    );
}