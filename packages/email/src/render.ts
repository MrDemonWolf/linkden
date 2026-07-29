import { render } from "@react-email/components";
import { createElement } from "react";
import {
	ContactNotification,
	type ContactNotificationProps,
} from "./templates/contact-notification";

/** Render the contact-notification email template to an HTML string. */
export function renderContactNotification(props: ContactNotificationProps): Promise<string> {
	return render(createElement(ContactNotification, props));
}
