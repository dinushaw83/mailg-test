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
    labels: ["Inbox", "Primary"],
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
    labels: ["Inbox", "Primary"],
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
    labels: ["Inbox", "Primary"],
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
    labels: ["Inbox", "Primary"],
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
    labels: ["Inbox", "Primary"],
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
    labels: ["Sent", "Primary"],
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
    labels: ["Inbox", "Primary"],
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
    labels: ["Inbox", "Primary"],
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
    labels: ["Inbox", "Primary"],
    labelColor: "#e1e3e1",
  },
  {
    id: 10,
    threadId: "#thread-f:1849139573456812324208",
    legacyThreadId: "1990982e903fc667",
    legacyLastMessageId: "1990982e903fc667",
    legacyLastNonDraftMessageId: "1990982e903fc667",
    from: {
      name: "Smith Cooper",
      email: "smithcooper@example.com",
    },
    to: ["john.doe@example.com"],
    cc: [],
    bcc: [],
    subject: "Meeting Follow-up",
    body: "Hi John, I wanted to follow up on our meeting yesterday. The project timeline looks good and I'm excited to move forward with the collaboration.",
    preview:
      "Hi John, I wanted to follow up on our meeting yesterday. The project timeline looks good and I'm excited to move forward with the collaboration.",
    timestamp: "2025-09-02T14:30:00.000Z",
    timeDisplay: "2:30 PM",
    read: false,
    starred: false,
    important: false,
    labels: ["Inbox", "Primary"],
    labelColor: "#e1e3e1",
  },
  {
    id: 11,
    threadId: "#thread-f:1849139573456812324301",
    from: { name: "Amazon Deals", email: "deals@amazon.com" },
    to: ["john.doe@example.com"],
    subject: "🔥 50% OFF Electronics — Today Only!",
    body: "Huge sale on gadgets. View in browser. Unsubscribe here.",
    preview: "Huge sale on gadgets. 50% off electronics. Limited time!",
    timestamp: "2025-09-02T09:00:00.000Z",
    timeDisplay: "Sep 2",
    read: false,
    starred: false,
    important: false,
    labels: ["Inbox", "Promotions"],
    labelColor: "#ffe1e1",
  },
  {
    id: 12,
    threadId: "#thread-f:1849139573456812324302",
    from: { name: "Nike Store", email: "news@nike.com" },
    to: ["john.doe@example.com"],
    subject: "Exclusive Offer: 30% Off Running Shoes",
    body: "Shop our latest collection with a 30% discount. Limited time only. Unsubscribe here.",
    preview: "30% off Nike Running Shoes. Don’t miss out!",
    timestamp: "2025-09-02T12:00:00.000Z",
    timeDisplay: "Sep 2",
    read: true,
    starred: false,
    important: false,
    labels: ["Inbox", "Social"],
    labelColor: "#ffe6cc",
  },
  {
    id: 13,
    threadId: "#thread-f:1849139573456812324303",
    from: { name: "Apple", email: "no-reply@apple.com" },
    to: ["john.doe@example.com"],
    subject: "Your Apple receipt for iCloud storage",
    body: "Payment confirmation: $0.99 charged for 50GB iCloud storage plan.",
    preview: "Receipt: $0.99 charged for iCloud storage.",
    timestamp: "2025-09-02T08:30:00.000Z",
    timeDisplay: "Sep 2",
    read: true,
    starred: false,
    important: true,
    labels: ["Inbox", "Updates"],
    labelColor: "#e1f7e1",
  },
  // Spam emails
  {
    id: 14,
    threadId: "#thread-f:1849139573456812324401",
    legacyThreadId: "1990982e903fc668",
    legacyLastMessageId: "1990982e903fc668",
    legacyLastNonDraftMessageId: "1990982e903fc668",
    from: {
      name: "Lucky Winner",
      email: "winner@mega-lottery-winners.com",
    },
    to: ["john.doe@example.com"],
    subject: "🎉 CONGRATULATIONS! You've Won $1,000,000!",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #ff6b6b, #ffd93d);">
      <div style="text-align: center; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h1 style="color: #ff6b6b; font-size: 32px; margin: 0 0 20px 0;">🎉 CONGRATULATIONS! 🎉</h1>
        <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0;">You've Won $1,000,000!</h2>
        <p style="font-size: 18px; color: #666; margin: 0 0 30px 0;">Dear Winner,</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
          Congratulations! You have been selected as the winner of our Mega Lottery Prize of <strong style="color: #ff6b6b;">$1,000,000 USD</strong>!
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 30px 0;">
          To claim your prize, please click the button below and provide your personal information including your bank account details for immediate transfer.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: #ff6b6b; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-size: 18px; font-weight: bold; display: inline-block;">CLAIM YOUR PRIZE NOW</a>
        </div>
        <p style="font-size: 12px; color: #999; margin: 30px 0 0 0;">
          This offer expires in 24 hours. Act now to secure your winnings!
        </p>
      </div>
    </div>`,
    preview: "🎉 CONGRATULATIONS! You've Won $1,000,000! - Claim your prize now!",
    timestamp: "2025-09-02T16:45:00.000Z",
    timeDisplay: "4:45 PM",
    read: false,
    starred: false,
    important: false,
    labels: ["Spam"],
    labelColor: "#ffebee",
  },
  {
    id: 15,
    threadId: "#thread-f:1849139573456812324402",
    legacyThreadId: "1990982e903fc669",
    legacyLastMessageId: "1990982e903fc669",
    legacyLastNonDraftMessageId: "1990982e903fc669",
    from: {
      name: "Dr. Sarah Williams",
      email: "sarah.williams@miracle-pills-now.com",
    },
    to: ["john.doe@example.com"],
    subject: "URGENT: Your Health is at Risk - Revolutionary Weight Loss Solution",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
      <div style="background: white; padding: 25px; border-radius: 10px; border-left: 5px solid #28a745;">
        <h1 style="color: #28a745; font-size: 24px; margin: 0 0 20px 0;">⚠️ URGENT HEALTH ALERT ⚠️</h1>
        <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Dear John,</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
          As a medical professional, I'm concerned about your health. Recent studies show that excess weight can lead to serious health complications including diabetes, heart disease, and even cancer.
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
          I've discovered a revolutionary weight loss solution that has helped over 10,000 patients lose 30+ pounds in just 30 days! This breakthrough formula contains natural ingredients that boost metabolism and burn fat while you sleep.
        </p>
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #28a745; margin: 0 0 10px 0;">✨ SPECIAL OFFER - LIMITED TIME ✨</h3>
          <p style="margin: 0; color: #333;">Get 50% OFF + FREE shipping when you order today!</p>
          <p style="margin: 10px 0 0 0; font-size: 18px; color: #ff6b6b; font-weight: bold;">Regular Price: $199.99 | Today Only: $99.99</p>
        </div>
        <div style="text-align: center; margin: 25px 0;">
          <a href="#" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">ORDER NOW - SAVE 50%</a>
        </div>
        <p style="font-size: 12px; color: #666; margin: 20px 0 0 0;">
          *Results may vary. This email was sent to john.doe@example.com. If you no longer wish to receive these emails, click here to unsubscribe.
        </p>
      </div>
    </div>`,
    preview: "URGENT: Your Health is at Risk - Revolutionary Weight Loss Solution - 50% OFF today only!",
    timestamp: "2025-09-02T14:20:00.000Z",
    timeDisplay: "2:20 PM",
    read: false,
    starred: false,
    important: false,
    labels: ["Spam"],
    labelColor: "#ffebee",
  },
  {
    id: 18,
    threadId: "#thread-f:1849139573456812324405",
    legacyThreadId: "1990982e903fc672",
    legacyLastMessageId: "1990982e903fc672",
    legacyLastNonDraftMessageId: "1990982e903fc672",
    from: {
      name: "Bank Security Alert",
      email: "security@your-bank-urgent.com",
    },
    to: ["john.doe@example.com"],
    subject: "🚨 URGENT: Suspicious Activity Detected - Verify Your Account",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
      <div style="background: white; padding: 25px; border-radius: 10px; border: 2px solid #dc3545;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #dc3545; font-size: 24px; margin: 0 0 10px 0;">🚨 SECURITY ALERT 🚨</h1>
          <p style="color: #666; font-size: 16px; margin: 0;">Your Bank Security Team</p>
        </div>
        
        <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h2 style="color: #dc3545; margin: 0 0 15px 0; font-size: 18px;">Suspicious Activity Detected</h2>
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 15px 0;">
            We have detected unusual activity on your account. Someone attempted to access your account from an unrecognized device in a foreign country.
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 15px 0;">
            <strong>Transaction Details:</strong><br>
            • Amount: $2,847.50<br>
            • Location: Moscow, Russia<br>
            • Time: Today, 3:47 AM<br>
            • Status: PENDING VERIFICATION
          </p>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #28a745; margin: 0 0 10px 0;">✅ Immediate Action Required</h3>
          <p style="margin: 0 0 15px 0; color: #333;">
            To secure your account and prevent unauthorized access, please verify your identity by clicking the button below:
          </p>
          <div style="text-align: center;">
            <a href="#" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">VERIFY ACCOUNT NOW</a>
          </div>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Important:</strong> If you do not verify your account within 24 hours, your account will be temporarily suspended for security reasons.
          </p>
        </div>
        
        <p style="font-size: 12px; color: #666; margin: 20px 0 0 0;">
          This email was sent to john.doe@example.com. If you did not request this verification, please contact our security team immediately.
        </p>
      </div>
    </div>`,
    preview: "🚨 URGENT: Suspicious Activity Detected - Verify Your Account - Transaction from Moscow, Russia",
    timestamp: "2025-09-01T22:30:00.000Z",
    timeDisplay: "Sep 1",
    read: false,
    starred: false,
    important: false,
    labels: ["Spam"],
    labelColor: "#ffebee",
  },
  {
    id: 19,
    threadId: "#thread-f:1849139573456812324406",
    legacyThreadId: "1990982e903fc673",
    legacyLastMessageId: "1990982e903fc673",
    legacyLastNonDraftMessageId: "1990982e903fc673",
    from: {
      name: "Cryptocurrency Expert",
      email: "crypto@bitcoin-millionaire-secrets.com",
    },
    to: ["john.doe@example.com"],
    subject: "💰 Turn $100 into $100,000 with this ONE crypto secret!",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f093fb, #f5576c);">
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.2);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f5576c; font-size: 28px; margin: 0 0 10px 0;">💰 CRYPTO MILLIONAIRE SECRET 💰</h1>
          <p style="color: #666; font-size: 16px; margin: 0;">From: Crypto Expert Mike</p>
        </div>
        
        <div style="background: #fff5f5; padding: 25px; border-radius: 10px; margin: 20px 0;">
          <h2 style="color: #f5576c; margin: 0 0 20px 0; font-size: 22px;">🚀 The Secret That Made Me $2.3 Million</h2>
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
            I discovered a little-known cryptocurrency that's about to explode! While everyone else is focused on Bitcoin and Ethereum, I found a hidden gem that's already made me $2.3 million in just 6 months.
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
            This crypto is backed by major tech companies and has partnerships with Google, Amazon, and Microsoft. The price is about to skyrocket by 1,000% in the next 30 days!
          </p>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #28a745; margin: 0 0 15px 0;">📈 PROVEN RESULTS 📈</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #28a745;">$100 → $1,200</div>
              <div style="font-size: 14px; color: #666;">Month 1</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #28a745;">$1,200 → $15,000</div>
              <div style="font-size: 14px; color: #666;">Month 3</div>
            </div>
          </div>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">⚡ LIMITED TIME OFFER ⚡</h3>
          <p style="margin: 0 0 15px 0; color: #333;">
            Get my exclusive crypto trading course for just $97 (Regular price $497). This includes:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #333;">
            <li>Exact crypto name and where to buy it</li>
            <li>Step-by-step trading strategy</li>
            <li>24/7 support from my team</li>
            <li>Money-back guarantee</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="#" style="background: #f5576c; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-size: 18px; font-weight: bold;">GET THE SECRET NOW</a>
        </div>
        
        <p style="font-size: 12px; color: #999; margin: 20px 0 0 0; text-align: center;">
          This email was sent to john.doe@example.com. Unsubscribe here.
        </p>
      </div>
    </div>`,
    preview: "💰 Turn $100 into $100,000 with this ONE crypto secret! - Get my exclusive trading course for $97",
    timestamp: "2025-09-01T19:45:00.000Z",
    timeDisplay: "Sep 1",
    read: false,
    starred: false,
    important: false,
    labels: ["Spam"],
    labelColor: "#ffebee",
  },
];
