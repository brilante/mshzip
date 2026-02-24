/**
 * Schema.org 생성기 - ToolBase 기반
 * 구조화된 데이터 마크업 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SchemaGen = class SchemaGen extends ToolBase {
  constructor() {
    super('SchemaGen');
    this.currentType = 'Article';
  }

  init() {
    this.initElements({
      schemaOutput: 'schemaOutput',
      htmlPreview: 'htmlPreview',
      // Article fields
      articleTitle: 'articleTitle',
      articleDesc: 'articleDesc',
      articleImage: 'articleImage',
      articleAuthor: 'articleAuthor',
      articlePublisher: 'articlePublisher',
      articleLogo: 'articleLogo',
      articleDate: 'articleDate',
      articleModified: 'articleModified',
      // Product fields
      productName: 'productName',
      productDesc: 'productDesc',
      productImage: 'productImage',
      productBrand: 'productBrand',
      productPrice: 'productPrice',
      productCurrency: 'productCurrency',
      productAvailability: 'productAvailability',
      productRating: 'productRating',
      productReviews: 'productReviews',
      // LocalBusiness fields
      bizName: 'bizName',
      bizDesc: 'bizDesc',
      bizImage: 'bizImage',
      bizPhone: 'bizPhone',
      bizStreet: 'bizStreet',
      bizCity: 'bizCity',
      bizRegion: 'bizRegion',
      bizPostal: 'bizPostal',
      bizCountry: 'bizCountry',
      bizLat: 'bizLat',
      bizLng: 'bizLng',
      bizHours: 'bizHours',
      // FAQ fields
      faqItems: 'faqItems',
      // Organization fields
      orgName: 'orgName',
      orgUrl: 'orgUrl',
      orgLogo: 'orgLogo',
      orgDesc: 'orgDesc',
      orgPhone: 'orgPhone',
      orgSocial: 'orgSocial'
    });

    this.generate();

    console.log('[SchemaGen] 초기화 완료');
    return this;
  }

  setType(type) {
    this.currentType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    document.querySelectorAll('.schema-form').forEach(form => {
      form.style.display = form.dataset.type === type ? 'block' : 'none';
    });
    this.generate();
  }

  generate() {
    let schema = {};

    switch (this.currentType) {
      case 'Article':
        schema = this.generateArticle();
        break;
      case 'Product':
        schema = this.generateProduct();
        break;
      case 'LocalBusiness':
        schema = this.generateLocalBusiness();
        break;
      case 'FAQ':
        schema = this.generateFAQ();
        break;
      case 'Organization':
        schema = this.generateOrganization();
        break;
    }

    const output = JSON.stringify(schema, null, 2);
    this.elements.schemaOutput.textContent = output;
    this.updatePreview(output);
  }

  generateArticle() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: this.elements.articleTitle.value || '기사 제목',
      description: this.elements.articleDesc.value || '기사 설명',
      image: this.elements.articleImage.value || 'https://example.com/image.jpg',
      author: {
        '@type': 'Person',
        name: this.elements.articleAuthor.value || '저자명'
      },
      publisher: {
        '@type': 'Organization',
        name: this.elements.articlePublisher.value || '발행사',
        logo: {
          '@type': 'ImageObject',
          url: this.elements.articleLogo.value || 'https://example.com/logo.png'
        }
      },
      datePublished: this.elements.articleDate.value || new Date().toISOString().split('T')[0],
      dateModified: this.elements.articleModified.value || new Date().toISOString().split('T')[0]
    };
  }

  generateProduct() {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: this.elements.productName.value || '제품명',
      description: this.elements.productDesc.value || '제품 설명',
      image: this.elements.productImage.value || 'https://example.com/product.jpg',
      brand: {
        '@type': 'Brand',
        name: this.elements.productBrand.value || '브랜드'
      },
      offers: {
        '@type': 'Offer',
        price: this.elements.productPrice.value || '0',
        priceCurrency: this.elements.productCurrency.value || 'KRW',
        availability: 'https://schema.org/' + (this.elements.productAvailability.value || 'InStock')
      }
    };

    const rating = this.elements.productRating.value;
    if (rating) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: this.elements.productReviews.value || '1'
      };
    }

    return schema;
  }

  generateLocalBusiness() {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: this.elements.bizName.value || '비즈니스명',
      description: this.elements.bizDesc.value || '비즈니스 설명',
      image: this.elements.bizImage.value || 'https://example.com/business.jpg',
      telephone: this.elements.bizPhone.value || '+82-10-1234-5678',
      address: {
        '@type': 'PostalAddress',
        streetAddress: this.elements.bizStreet.value || '거리 주소',
        addressLocality: this.elements.bizCity.value || '서울',
        addressRegion: this.elements.bizRegion.value || '서울특별시',
        postalCode: this.elements.bizPostal.value || '12345',
        addressCountry: this.elements.bizCountry.value || 'KR'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: this.elements.bizLat.value || '37.5665',
        longitude: this.elements.bizLng.value || '126.9780'
      },
      openingHours: this.elements.bizHours.value || 'Mo-Fr 09:00-18:00'
    };
  }

  generateFAQ() {
    const faqText = this.elements.faqItems.value || 'Q: 질문1\nA: 답변1\n\nQ: 질문2\nA: 답변2';
    const pairs = faqText.split('\n\n').filter(p => p.trim());

    const mainEntity = pairs.map(pair => {
      const lines = pair.split('\n');
      const question = lines.find(l => l.startsWith('Q:'))?.replace('Q:', '').trim() || '';
      const answer = lines.find(l => l.startsWith('A:'))?.replace('A:', '').trim() || '';
      return {
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer
        }
      };
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity
    };
  }

  generateOrganization() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.elements.orgName.value || '조직명',
      url: this.elements.orgUrl.value || 'https://example.com',
      logo: this.elements.orgLogo.value || 'https://example.com/logo.png',
      description: this.elements.orgDesc.value || '조직 설명',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: this.elements.orgPhone.value || '+82-10-1234-5678',
        contactType: 'customer service'
      },
      sameAs: (this.elements.orgSocial.value || '').split(',').map(s => s.trim()).filter(s => s)
    };
  }

  updatePreview(json) {
    const script = `<script type="application/ld+json">\n${json}\n<\/script>`;
    this.elements.htmlPreview.textContent = script;
  }

  async copySchema() {
    const schema = this.elements.schemaOutput.textContent;
    const success = await this.copyToClipboard(schema);
    this.showToast(success ? 'JSON 복사됨!' : '복사 실패', success ? 'success' : 'error');
  }

  async copyHTML() {
    const html = this.elements.htmlPreview.textContent;
    const success = await this.copyToClipboard(html);
    this.showToast(success ? 'HTML 복사됨!' : '복사 실패', success ? 'success' : 'error');
  }
}

// 전역 인스턴스 생성
const schemaGen = new SchemaGen();
window.SchemaGen = schemaGen;

document.addEventListener('DOMContentLoaded', () => schemaGen.init());
