import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';

const TermsAndConditionsPage = () => {
  return (
    <>
      <Helmet>
        <title>Terms & Conditions - EventHost</title>
        <meta name="description" content="Read the terms and conditions for using the EventHost platform." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-white"
      >
        <div className="max-w-4xl mx-auto glass-effect p-8 md:p-12 rounded-2xl border border-white/10">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 gradient-text text-center">
            Terms & Conditions
          </h1>
          <div className="prose prose-invert max-w-none prose-h2:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-white/80 prose-a:text-purple-400 hover:prose-a:text-purple-300 prose-ul:list-disc prose-ul:pl-6 prose-li:text-white/80">
            <p className="text-white/60 text-center">Last updated: September 8, 2025</p>

            <h2>1. Introduction</h2>
            <p>
              Welcome to EventHost! These Terms and Conditions govern your use of our website and services. By accessing or using our platform, you agree to be bound by these terms. If you do not agree with any part of these terms, you must not use our services.
            </p>

            <h2>2. User Accounts</h2>
            <p>
              To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h2>3. Event Creation and Attendance</h2>
            <p>
              Event Organizers are responsible for the content of their event listings and for complying with all applicable laws. EventHost reserves the right to remove any event that violates our policies. Attendees agree to behave respectfully and responsibly at all events.
            </p>

            <h2>4. Payments and Refunds</h2>
            <p>
              All payments are processed through our third-party payment gateways. EventHost is not responsible for any payment processing errors. Refund policies are set by the individual Event Organizer for each event.
            </p>

            <h2>5. Intellectual Property</h2>
            <p>
              The content on our platform, including text, graphics, logos, and software, is the property of EventHost or its licensors and is protected by copyright and other intellectual property laws.
            </p>

            <h2>6. Limitation of Liability</h2>
            <p>
              EventHost is provided "as is" without any warranties. We are not liable for any damages arising from your use of our platform, including but not limited to direct, indirect, incidental, or consequential damages.
            </p>

            <h2>7. Changes to Terms</h2>
            <p>
              We may update these Terms and Conditions from time to time. We will notify you of any changes by posting the new terms on this page. Your continued use of the service after any changes constitutes your acceptance of the new terms.
            </p>

            <h2>8. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at support@zorarte.com.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default TermsAndConditionsPage;