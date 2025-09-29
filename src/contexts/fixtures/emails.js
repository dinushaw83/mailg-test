// Initial emails data fixture

export const initialEmails = [
  {
    id: 1,
    threadId: "#thread-f:1842139573356840007",
    legacyThreadId: "1990982e909fc447",
    legacyLastMessageId: "1990982e909fc447",
    legacyLastNonDraftMessageId: "1990982e909fc447",
    from: {
      name: "GitHub",
      email: "noreply@github.com",
    },
    to: ["john.doe@example.com"],
    subject: "[GitHub] Your Dependabot alerts for the week of Aug 26 - Sep 2",
    body: "Explore this week on GitHub GitHub security alert digest john's repository security updates from the week of Aug 26 - Sep 2 john's personal account john / aspiod Known security",
    preview:
      "Explore this week on GitHub GitHub security alert digest john's repository security updates from the week of Aug 26 - Sep 2 john's personal account john / aspiod Known security",
    timestamp: "2025-09-02T11:19:00.000Z",
    timeDisplay: "11:19 AM",
    read: false,
    starred: true,
    important: false,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
  },
  // Thread with multiple messages (GitHub device verification)
  // Existing message id:2 is the first one in this thread. Add replies/follow-ups.
  {
    id: 2,
    threadId: "#thread-f:1842087366422769452",
    legacyThreadId: "199068b330dd2f2c",
    legacyLastMessageId: "199068b330dd2f2c",
    legacyLastNonDraftMessageId: "199068b330dd2f2c",
    from: {
      name: "GitHub",
      email: "noreply@github.com",
    },
    to: ["john.doe@example.com"],
    subject: "[GitHub] Please verify your device",
    body: "Hey john! A sign in attempt requires further verification because we did not recognize your device. To complete the sign in, enter the verification code on the unrecognized device. Device: Chrome on",
    preview:
      "Hey john! A sign in attempt requires further verification because we did not recognize your device. To complete the sign in, enter the verification code on the unrecognized device. Device: Chrome on",
    timestamp: "2025-09-01T21:30:00.000Z",
    timeDisplay: "Sep 1",
    read: true,
    starred: true,
    important: true,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
    attachments: [
      {
        id: 18420873664227694521,
        name: "attachment.webp",
        url: "/assets/images/attachment.webp",
        size: "1.2 MB",
        type: "image/webp",
      },
      {
        id: 18320873464227694522,
        name: "attachment2.webp",
        url: "/assets/images/attachment.webp",
        size: "980 KB",
        type: "image/webp",
      },
    ],
  },
  {
    id: 3,
    threadId: "#thread-f:1842085083087208760",
    legacyThreadId: "1990669f8f758138",
    legacyLastMessageId: "1990669f8f758138",
    legacyLastNonDraftMessageId: "1990669f8f758138",
    from: {
      name: "Notion Team",
      email: "notify@updates.notion.so",
    },
    to: ["john.doe@example.com"],
    subject: "A new device logged into your account",
    body: "Review a recent login from a new device There was a recent login to your Notion account. Please review the details: Account john.doe@example.com Login method Login with Google IP & approximate",
    preview:
      "Review a recent login from a new device There was a recent login to your Notion account. Please review the details: Account john.doe@example.com Login method Login with Google IP & approximate",
    timestamp: "2025-09-01T20:53:00.000Z",
    timeDisplay: "Sep 1",
    read: true,
    starred: true,
    important: false,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
    attachments: [
      {
        id: 18420850830872087601,
        name: "attachment.webp",
        url: "/assets/images/attachment.webp",
        size: "1.3 MB",
        type: "image/webp",
      },
    ],
  },
  {
    id: 4,
    threadId: "#thread-f:1842085083087208761",
    legacyThreadId: "1990669f8f758139",
    legacyLastMessageId: "1990669f8f758139",
    legacyLastNonDraftMessageId: "1990669f8f758139",
    from: {
      name: "Stripe",
      email: "receipts@stripe.com",
    },
    to: "john.doe@example.com",
    subject: "Receipt for your payment to Acme Corp",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #635bff; margin: 0; font-size: 24px;">Stripe</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 18px;">Payment Receipt</h2>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Thank you for your payment!</p>
      </div>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="font-weight: bold; color: #1a1a1a;">Amount:</span>
          <span style="font-weight: bold; color: #1a1a1a;">$29.99</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #6b7280;">Description:</span>
          <span style="color: #1a1a1a;">Acme Corp - Pro Plan</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #6b7280;">Date:</span>
          <span style="color: #1a1a1a;">September 1, 2025</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #6b7280;">Payment Method:</span>
          <span style="color: #1a1a1a;">•••• •••• •••• 4242</span>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
          <span style="color: #1a1a1a;">Total:</span>
          <span style="color: #1a1a1a;">$29.99</span>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" style="background: #635bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Download Receipt</a>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p>Questions? Contact us at support@stripe.com</p>
        <p>Stripe, Inc. • 510 Townsend Street, San Francisco, CA 94103</p>
      </div>
    </div>`,
    preview: "Receipt for your payment to Acme Corp - Thank you for your payment! Amount: $29.99",
    timestamp: "2025-09-01T18:45:00.000Z",
    timeDisplay: "Sep 1",
    read: false,
    starred: false,
    important: false,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
  },
  {
    id: 5,
    threadId: "#thread-f:1842085083087208762",
    legacyThreadId: "1990669f8f758140",
    legacyLastMessageId: "1990669f8f758140",
    legacyLastNonDraftMessageId: "1990669f8f758140",
    from: {
      name: "LinkedIn",
      email: "notifications@linkedin.com",
    },
    to: ["john.doe@example.com"],
    subject: "You have 3 new connection requests",
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f2ef;">
      <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://static.licdn.com/sc/h/8s162nmoekm8yvs0y8y5k8q4y" alt="LinkedIn" style="height: 32px; margin-bottom: 16px;">
          <h1 style="color: #0a66c2; margin: 0; font-size: 20px; font-weight: 600;">New Connection Requests</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #666; font-size: 14px;">You have <strong>3 new connection requests</strong> waiting for your response.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; padding: 12px; border: 1px solid #e1e5e9; border-radius: 8px; margin-bottom: 8px; background: white;">
            <div style="width: 48px; height: 48px; background: #0a66c2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="color: white; font-weight: bold; font-size: 18px;">JS</span>
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #1a1a1a;">Jane Smith</h3>
              <p style="margin: 0; color: #666; font-size: 14px;">Senior Software Engineer at Tech Corp</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button style="background: #0a66c2; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer;">Accept</button>
              <button style="background: transparent; color: #666; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer;">Ignore</button>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; padding: 12px; border: 1px solid #e1e5e9; border-radius: 8px; margin-bottom: 8px; background: white;">
            <div style="width: 48px; height: 48px; background: #28a745; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="color: white; font-weight: bold; font-size: 18px;">MJ</span>
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #1a1a1a;">Mike Johnson</h3>
              <p style="margin: 0; color: #666; font-size: 14px;">Product Manager at StartupXYZ</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button style="background: #0a66c2; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer;">Accept</button>
              <button style="background: transparent; color: #666; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer;">Ignore</button>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; padding: 12px; border: 1px solid #e1e5e9; border-radius: 8px; background: white;">
            <div style="width: 48px; height: 48px; background: #ff6b35; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <span style="color: white; font-weight: bold; font-size: 18px;">AL</span>
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #1a1a1a;">Alex Lee</h3>
              <p style="margin: 0; color: #666; font-size: 14px;">UX Designer at Creative Agency</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button style="background: #0a66c2; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer;">Accept</button>
              <button style="background: transparent; color: #666; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer;">Ignore</button>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 24px;">
          <a href="#" style="background: #0a66c2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View All Requests</a>
        </div>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e1e5e9; text-align: center; color: #666; font-size: 12px;">
          <p>This email was sent to john.doe@example.com</p>
          <p>© 2025 LinkedIn Corporation. All rights reserved.</p>
        </div>
      </div>
    </div>`,
    preview:
      "You have 3 new connection requests - Jane Smith, Mike Johnson, and Alex Lee want to connect with you on LinkedIn.",
    timestamp: "2025-08-31T14:22:00.000Z",
    timeDisplay: "Aug 31",
    read: false,
    starred: true,
    important: false,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
  },
  {
    id: 6,
    threadId: "#thread-f:1842087366422769452",
    legacyThreadId: "199068b330dd2f2c",
    legacyLastMessageId: "199068b330dd2f2d",
    legacyLastNonDraftMessageId: "199068b330dd2f2d",
    from: {
      name: "John Doe",
      email: "john.doe@example.com",
    },
    to: ["noreply@github.com"],
    subject: "Re: [GitHub] Please verify your device",
    body: "Hi GitHub team, this was me. I successfully verified my device. Thanks!",
    preview: "Hi GitHub team, this was me. I successfully verified my device.",
    timestamp: "2025-09-01T21:35:00.000Z",
    timeDisplay: "Sep 1",
    read: true,
    starred: true,
    important: false,
    labels: ["Sent"],
    labelColor: "#e1e3e1",
  },
  {
    id: 7,
    threadId: "#thread-f:1842087366422769452",
    legacyThreadId: "199068b330dd2f2c",
    legacyLastMessageId: "199068b330dd2f2e",
    legacyLastNonDraftMessageId: "199068b330dd2f2e",
    from: {
      name: "GitHub",
      email: "noreply@github.com",
    },
    to: ["john.doe@example.com"],
    subject: "Re: [GitHub] Please verify your device",
    body: "Thanks for confirming, John. If this wasn’t you, reset your password immediately. This email address is not monitored.",
    preview: "Thanks for confirming, John. If this wasn’t you, reset your password immediately.",
    timestamp: "2025-09-01T21:36:00.000Z",
    timeDisplay: "Sep 1",
    read: false,
    starred: true,
    important: true,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
  },
  {
    id: 8,
    threadId: "#thread-f:1842087366422769452",
    legacyThreadId: "199068b330dd2f2c",
    legacyLastMessageId: "199068b330dd2f2f",
    legacyLastNonDraftMessageId: "199068b330dd2f2f",
    from: {
      name: "GitHub",
      email: "noreply@github.com",
    },
    to: ["john.doe@example.com"],
    subject: "[GitHub] New sign-in from Chrome on Mac",
    body: "We noticed a new sign-in to your account from Chrome on macOS. If this was you, no further action is required.",
    preview: "New sign-in to your account from Chrome on macOS.",
    timestamp: "2025-09-01T21:25:00.000Z",
    timeDisplay: "Sep 1",
    read: true,
    starred: false,
    important: false,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
  },
  {
    id: 9,
    threadId: "#thread-f:1849139573456812324207",
    legacyThreadId: "1990982e903fc666",
    legacyLastMessageId: "1990982e903fc666",
    legacyLastNonDraftMessageId: "1990982e903fc666",
    from: {
      name: "Jane Smith",
      email: "jane.smith@example.com",
    },
    cc: ["michael.johnson@example.com", "sarah.wilson@example.com"],
    to: ["john.doe@example.com", "robert.miller@example.com"],
    subject: "IMPORTANT: Discussion on the Acme Project",
    body: "We want to discuss the Acme Project with you. Please let us know your availability.",
    preview: "We want to discuss the Acme Project with you. Please let us know your availability.",
    timestamp: "2025-09-02T11:19:00.000Z",
    timeDisplay: "11:19 AM",
    read: false,
    starred: true,
    important: true,
    labels: ["Inbox"],
    labelColor: "#e1e3e1",
  },
];
