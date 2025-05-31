import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  imports: [RouterLink],
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  showAbout() {
    Swal.fire({
      title: 'About Us',
      html: `
        <div class="text-left">
          <p class="mb-4 text-gray-700">
            <span class="font-semibold text-purple-800">CüRa</span> is an innovative healthcare platform revolutionizing 
            medical data management with cutting-edge technology.
          </p>
          <ul class="list-disc pl-5 space-y-2 text-gray-600">
            <li>Secure patient medical records</li>
            <li>Real-time health data access</li>
            <li>AI-powered health insights</li>
            <li>Seamless doctor-patient communication</li>
          </ul>
          <p class="mt-4 text-gray-700">
            Our mission is to make healthcare management <span class="font-semibold text-purple-800">accessible, intuitive, and secure</span> 
            for everyone.
          </p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Learn More',
      confirmButtonColor: '#6c5379',
      showCancelButton: true,
      cancelButtonText: 'Close',
      cancelButtonColor: '#f8ede3',
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-2xl font-bold text-purple-900',
        confirmButton: 'px-6 py-2 rounded-full font-medium',
        cancelButton: 'px-6 py-2 rounded-full font-medium',
      },
    });
  }

  showTerms() {
    Swal.fire({
      title: 'Terms & Conditions',
      html: `
        <div class="text-left max-h-96 overflow-y-auto pr-4">
          <h3 class="font-bold text-lg text-purple-800 mb-2">1. Data Privacy</h3>
          <p class="mb-4 text-gray-700">
            We adhere to strict HIPAA compliance standards to ensure your medical data remains confidential and secure.
          </p>
          
          <h3 class="font-bold text-lg text-purple-800 mb-2">2. User Responsibilities</h3>
          <p class="mb-4 text-gray-700">
            Users are responsible for maintaining the confidentiality of their login credentials and reporting any unauthorized access immediately.
          </p>
          
          <h3 class="font-bold text-lg text-purple-800 mb-2">3. Service Availability</h3>
          <p class="mb-4 text-gray-700">
            While we strive for 99.9% uptime, scheduled maintenance may occasionally limit access to the platform.
          </p>
          
          <h3 class="font-bold text-lg text-purple-800 mb-2">4. Data Accuracy</h3>
          <p class="text-gray-700">
            Users are responsible for verifying the accuracy of their medical information and reporting any discrepancies.
          </p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'I Understand',
      confirmButtonColor: '#6c5379',
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-2xl font-bold text-purple-900',
        confirmButton: 'px-6 py-2 rounded-full font-medium',
      },
      scrollbarPadding: false,
    });
  }

  showContact() {
    Swal.fire({
      title: 'Contact Us',
      html: `
        <div class="text-left max-h-96 overflow-y-auto pr-4">
          <h3 class="font-bold text-lg text-purple-800 mb-2">Get in Touch</h3>
          <p class="mb-4 text-gray-700">
            Have questions or need support? Reach out to our team at any time.
          </p>
          
          <h3 class="font-bold text-lg text-purple-800 mb-2">Email</h3>
          <p class="mb-4 text-gray-700">
            <a href="mailto:curaegypt100@gmail.com" class="text-purple-800 hover:underline">curaegypt100@gmail.com</a>
          </p>
          
          <h3 class="font-bold text-lg text-purple-800 mb-2">Phone</h3>
          <p class="mb-4 text-gray-700">
            +20 123 456 7890
          </p>
          
          <h3 class="font-bold text-lg text-purple-800 mb-2">Support Hours</h3>
          <p class="text-gray-700">
            Monday - Friday: 9:00 AM - 5:00 PM (EET)<br>
            Saturday: 10:00 AM - 2:00 PM (EET)
          </p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Got It',
      confirmButtonColor: '#6c5379',
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-2xl font-bold text-purple-900',
        confirmButton: 'px-6 py-2 rounded-full font-medium',
      },
      scrollbarPadding: false,
    });
  }
}
